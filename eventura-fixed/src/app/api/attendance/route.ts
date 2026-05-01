import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get("event_id");
    const session_id = searchParams.get("session_id");
    const participant_id = searchParams.get("participant_id");

    let query = supabase
      .from("attendance_logs")
      .select(`
        *,
        participant:participants(full_name, roll_number, university_email),
        session:event_sessions(session_name, session_type)
      `)
      .order("check_in_at", { ascending: false });

    if (event_id) query = query.eq("event_id", event_id);
    if (session_id) query = query.eq("session_id", session_id);
    if (participant_id) query = query.eq("participant_id", participant_id);

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
    const { data: userRecord } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", "")
      .maybeSingle();

    // Support bulk attendance marking
    if (Array.isArray(body)) {
      const rows = body.map((entry) => ({
        ...entry,
        marked_by: userRecord?.user_id,
        check_in_at: entry.check_in_at || new Date().toISOString(),
      }));
      const { data, error } = await supabase
        .from("attendance_logs")
        .upsert(rows, { onConflict: "event_id,session_id,participant_id" })
        .select();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data }, { status: 201 });
    }

    // Single attendance entry
    const { data, error } = await supabase
      .from("attendance_logs")
      .upsert(
        {
          ...body,
          marked_by: userRecord?.user_id,
          check_in_at: body.check_in_at || new Date().toISOString(),
        },
        { onConflict: "event_id,session_id,participant_id" }
      )
      .select(`*, participant:participants(full_name, roll_number)`)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
