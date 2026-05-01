import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get("event_id");
    const session_id = searchParams.get("session_id");

    let query = supabase
      .from("results")
      .select(`
        *,
        participant:participants(full_name, roll_number, department_id),
        team:teams(team_name, team_code)
      `)
      .order("rank_position", { ascending: true });

    if (event_id) query = query.eq("event_id", event_id);
    if (session_id) query = query.eq("session_id", session_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const body = await request.json();

    // Support bulk results insert
    if (Array.isArray(body)) {
      const { data, error } = await supabase
        .from("results")
        .insert(body)
        .select();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data }, { status: 201 });
    }

    const { data, error } = await supabase
      .from("results")
      .insert(body)
      .select(`*, participant:participants(full_name), team:teams(team_name)`)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { result_id, ...updates } = body;

    if (!result_id) return NextResponse.json({ error: "result_id required" }, { status: 400 });

    // Mark certificate as issued
    if (updates.certificate_issued) {
      updates.certificate_url = updates.certificate_url || null;
    }

    const { data, error } = await supabase
      .from("results")
      .update(updates)
      .eq("result_id", result_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
