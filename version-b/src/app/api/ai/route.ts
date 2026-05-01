import { NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";
import { createAdminClient } from "@/lib/supabase/server";

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);
const MODEL = "mistralai/Mistral-7B-Instruct-v0.3";

const AVAILABLE_VIEWS: Record<string, string> = {
  v_dept_event_counts: "Department-wise total event counts",
  v_top_events_registrations: "Top events ranked by registration count",
  v_event_conversion_rates: "Registration to attendance conversion rates per event",
  v_participant_ratio: "Internal vs external participant counts per event",
  v_monthly_event_frequency: "Number of events per month",
  v_category_feedback: "Average feedback ratings per event category",
  v_active_organizers: "Organisers ranked by number of events managed",
};

const ALLOWED_TABLES = [
  "events","departments","participants","registrations",
  "attendance_logs","results","feedback","organizers",
  "users","venues","teams","team_members","event_sessions",
  "judges","event_judges",
];

function buildPrompt(messages: { role: string; content: string }[], contextData: string): string {
  const system = `You are an analytics assistant for Eventura event management portal.
You have READ-ONLY access to a PostgreSQL database.

AVAILABLE VIEWS (use these first):
${Object.entries(AVAILABLE_VIEWS).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

ALLOWED TABLES: ${ALLOWED_TABLES.join(", ")}

RULES:
1. Only generate SELECT queries — never INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE
2. Use views first; fall back to tables only when needed
3. If generating SQL wrap it exactly like: {"sql": "SELECT ..."}
4. Always LIMIT results to 100 rows max
5. Explain findings clearly in plain English
6. Be concise — you are talking to college administrators and organisers
${contextData ? `\nCURRENT DATA SNAPSHOT:\n${contextData}` : ""}`;

  // Mistral instruct format: <s>[INST] system + first user [/INST] reply</s>[INST] next [/INST]...
  let prompt = `<s>[INST] ${system}\n\n`;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user") {
      if (i === 0) {
        prompt += `${m.content} [/INST]`;
      } else {
        prompt += `[INST] ${m.content} [/INST]`;
      }
    } else {
      prompt += ` ${m.content}</s>`;
    }
  }
  return prompt;
}

async function executeQuery(supabase: ReturnType<typeof createAdminClient>, sql: string) {
  const dangerous = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i;
  if (dangerous.test(sql)) throw new Error("Mutating queries are not allowed");

  const viewMatch = sql.match(/FROM\s+(v_\w+)/i);
  if (viewMatch) {
    const view = viewMatch[1].toLowerCase();
    if (Object.keys(AVAILABLE_VIEWS).includes(view)) {
      const { data, error } = await supabase.from(view).select("*").limit(100);
      if (error) throw new Error(error.message);
      return data;
    }
  }

  const { data, error } = await supabase.rpc("safe_select", { query: sql });
  if (error) throw new Error(`Raw SQL unavailable — run supabase-setup.sql first. (${error.message})`);
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { messages, preload_context } = await request.json();

    let contextData = "";
    if (preload_context) {
      const results = await Promise.all(
        Object.keys(AVAILABLE_VIEWS).map(async (view) => {
          const { data } = await supabase.from(view).select("*").limit(15);
          return `### ${view}\n${JSON.stringify(data, null, 2)}`;
        })
      );
      contextData = results.join("\n\n");
    }

    const prompt = buildPrompt(messages, contextData);

    let generatedText = "";
    try {
      const stream = hf.textGenerationStream({
        model: MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.3,
          top_p: 0.9,
          repetition_penalty: 1.1,
          return_full_text: false,
        },
      });

      for await (const chunk of stream) {
        if (chunk.token.special) break;
        generatedText += chunk.token.text;
      }
    } catch (hfErr) {
      console.error("HuggingFace error:", hfErr);
      return NextResponse.json({ error: "AI model unavailable. Check your HUGGINGFACE_TOKEN and model access." }, { status: 502 });
    }

    generatedText = generatedText.trim();

    // Execute any SQL the model generated
    let queryData = null;
    const sqlMatch =
      generatedText.match(/\{"sql":\s*"([\s\S]+?)"\}/) ||
      generatedText.match(/```json\s*\{"sql":\s*"([\s\S]+?)"\}\s*```/);

    if (sqlMatch) {
      try {
        const sql = sqlMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
        queryData = await executeQuery(supabase, sql);
        generatedText = generatedText.replace(sqlMatch[0], "").trim();
      } catch (err) {
        generatedText += `\n\n⚠️ Could not execute query: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    }

    return NextResponse.json({ message: generatedText, data: queryData });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
