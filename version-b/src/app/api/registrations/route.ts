import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get("event_id");
    const participant_id = searchParams.get("participant_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("registrations")
      .select(`
        *,
        participant:participants(*),
        event:events(event_name, event_code, event_start_at, status),
        team:teams(team_name, team_code)
      `, { count: "exact" })
      .order("registered_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (event_id) query = query.eq("event_id", event_id);
    if (participant_id) query = query.eq("participant_id", participant_id);
    if (status) query = query.eq("registration_status", status);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data, count });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { participant, team_members, ...regData } = body;

    // Upsert participant first
    let participantId = participant?.participant_id;
    if (!participantId && participant) {
      const { data: p, error: pErr } = await supabase
        .from("participants")
        .upsert(participant, { onConflict: "university_email" })
        .select()
        .single();
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
      participantId = p.participant_id;
    }

    // Check if event requires team
    const { data: event } = await supabase
      .from("events")
      .select("participation_mode, min_team_size, max_team_size, max_participants")
      .eq("event_id", regData.event_id)
      .single();

    // Check capacity
    if (event?.max_participants) {
      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", regData.event_id)
        .in("registration_status", ["confirmed", "pending"]);

      if ((count || 0) >= event.max_participants) {
        regData.registration_status = "waitlisted";
      }
    }

    // Handle team creation
    let teamId = regData.team_id;
    if (event?.participation_mode === "team" && team_members?.length) {
      const { data: team, error: teamErr } = await supabase
        .from("teams")
        .insert({
          event_id: regData.event_id,
          team_name: regData.team_name || `Team-${Date.now()}`,
          leader_participant_id: participantId,
        })
        .select()
        .single();

      if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 400 });
      teamId = team.team_id;

      // Add all members
      const memberRows = [
        { team_id: teamId, participant_id: participantId, is_leader: true },
        ...team_members.map((m: number) => ({ team_id: teamId, participant_id: m, is_leader: false })),
      ];
      await supabase.from("team_members").insert(memberRows);
    }

    const { data: registration, error: regErr } = await supabase
      .from("registrations")
      .insert({ ...regData, participant_id: participantId, team_id: teamId })
      .select(`*, participant:participants(*), team:teams(*)`)
      .single();

    if (regErr) return NextResponse.json({ error: regErr.message }, { status: 400 });
    return NextResponse.json({ data: registration }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
