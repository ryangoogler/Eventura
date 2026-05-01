import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const MISTRAL_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";

const AVAILABLE_VIEWS: Record<string, string> = {
  v_dept_event_counts: "Department-wise total event counts",
  v_top_events_registrations: "Top events ranked by registration count",
  v_event_conversion_rates: "Registration to attendance conversion rates per event",
  v_participant_ratio: "Internal vs external participant counts per event",
  v_monthly_event_frequency: "Number of events per month",
  v_category_feedback: "Average feedback ratings per event category",
  v_active_organizers: "Organisers ranked by number of events managed",
  v_semester_trends: "Event frequency by semester/month trend",
  v_participation_rate: "Participation rate per event (registered vs capacity)",
  v_top_performers: "Top ranked participants across competitions",
  v_dept_participation_volume: "Participation volume per department",
};

const ALLOWED_TABLES = [
  "events", "departments", "participants", "registrations",
  "attendance_logs", "results", "feedback", "organizers",
  "users", "venues", "teams", "team_members", "event_sessions",
  "judges", "event_judges",
];

function buildPrompt(
  messages: { role: string; content: string }[],
  contextData: string
): string {
  const systemContent = `You are an analytics assistant for Eventura, a college event management portal.
You have READ-ONLY access to a PostgreSQL database.

AVAILABLE VIEWS (use these first — they are pre-computed for performance):
${Object.entries(AVAILABLE_VIEWS).map(([k, v]) => `  - ${k}: ${v}`).join("\n")}

ALLOWED TABLES (use only when views are insufficient):
${ALLOWED_TABLES.join(", ")}

RULES:
1. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE
2. Always prefer views over raw table queries
3. When generating SQL, wrap it EXACTLY like this — no other format: {"sql": "SELECT ..."}
4. Always add LIMIT 100 to any query
5. Respond in plain English. Be concise and useful for college administrators.
6. If you cannot answer from the available data, say so clearly.
${contextData ? `\nCURRENT DATA SNAPSHOT (use this for context, do not re-query):\n${contextData}` : ""}`;

  // Mistral-7B-Instruct-v0.3 chat template format
  // <s>[INST] user message [/INST] assistant response </s>[INST] next user [/INST]
  // System prompt is prepended to the first user message
  let prompt = "<s>";

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user") {
      const content = i === 0
        ? `[INST] ${systemContent}\n\n${m.content} [/INST]`
        : `[INST] ${m.content} [/INST]`;
      prompt += content;
    } else if (m.role === "assistant") {
      prompt += ` ${m.content} </s>`;
    }
  }

  return prompt;
}

async function executeQuery(supabase: ReturnType<typeof createAdminClient>, sql: string) {
  const dangerous = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i;
  if (dangerous.test(sql)) {
    throw new Error("Only SELECT queries are permitted.");
  }

  // Try to match a known view
  const viewMatch = sql.match(/FROM\s+(v_\w+)/i);
  if (viewMatch) {
    const view = viewMatch[1].toLowerCase();
    if (Object.keys(AVAILABLE_VIEWS).includes(view)) {
      const { data, error } = await supabase.from(view).select("*").limit(100);
      if (error) throw new Error(error.message);
      return data;
    }
  }

  // Fall back to safe_select RPC
  const { data, error } = await supabase.rpc("safe_select", { query: sql });
  if (error) {
    throw new Error(
      `Query failed: ${error.message}. Make sure safe_select() RPC is created in your Supabase SQL editor.`
    );
  }
  return data;
}

export async function POST(request: NextRequest) {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "HUGGINGFACE_TOKEN is not set. Add it to your environment variables." },
      { status: 503 }
    );
  }

  try {
    const supabase = createAdminClient();
    const { messages, preload_context } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    // Optionally preload analytics context
    let contextData = "";
    if (preload_context) {
      const snapshots = await Promise.all(
        Object.keys(AVAILABLE_VIEWS).map(async (view) => {
          const { data } = await supabase.from(view).select("*").limit(10);
          return `### ${view}\n${JSON.stringify(data ?? [], null, 2)}`;
        })
      );
      contextData = snapshots.join("\n\n");
    }

    const prompt = buildPrompt(messages, contextData);

    // Call HuggingFace Inference API directly (REST, not SDK)
    // This avoids any SDK version issues with streaming
    const hfResponse = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.3,
          top_p: 0.9,
          repetition_penalty: 1.15,
          return_full_text: false,
          stop: ["</s>", "[INST]"],
        },
        options: {
          wait_for_model: true,  // wait instead of returning 503 on cold start
          use_cache: false,
        },
      }),
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error("HuggingFace error:", hfResponse.status, errText);

      if (hfResponse.status === 503) {
        return NextResponse.json(
          { error: "Model is loading. Please wait 20-30 seconds and try again." },
          { status: 503 }
        );
      }
      if (hfResponse.status === 429) {
        return NextResponse.json(
          { error: "Rate limit reached on HuggingFace free tier. Please wait a minute." },
          { status: 429 }
        );
      }
      if (hfResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid HuggingFace token. Check your HUGGINGFACE_TOKEN environment variable." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `AI model error (${hfResponse.status}). Try again shortly.` },
        { status: 502 }
      );
    }

    const hfData = await hfResponse.json();

    // HF inference API returns: [{ generated_text: "..." }]
    let generatedText: string =
      Array.isArray(hfData) && hfData[0]?.generated_text
        ? hfData[0].generated_text.trim()
        : typeof hfData?.generated_text === "string"
        ? hfData.generated_text.trim()
        : "";

    if (!generatedText) {
      return NextResponse.json(
        { error: "Model returned an empty response. Please rephrase your question." },
        { status: 502 }
      );
    }

    // Execute any SQL the model produced
    let queryData = null;
    const sqlMatch =
      generatedText.match(/\{"sql":\s*"([\s\S]+?)"\}/) ||
      generatedText.match(/```json\s*\{"sql":\s*"([\s\S]+?)"\}\s*```/);

    if (sqlMatch) {
      try {
        const sql = sqlMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\t/g, " ");
        queryData = await executeQuery(supabase, sql);
        // Remove the raw JSON block from the displayed text
        generatedText = generatedText.replace(sqlMatch[0], "").trim();
      } catch (err) {
        generatedText += `\n\n⚠️ Could not execute query: ${
          err instanceof Error ? err.message : "Unknown error"
        }`;
      }
    }

    return NextResponse.json({ message: generatedText, data: queryData });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
