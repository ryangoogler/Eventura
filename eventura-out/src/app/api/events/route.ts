import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const department_id = searchParams.get("department_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("events")
      .select(`
        *,
        department:departments(department_name, department_code),
        venue:venues(venue_name, campus_block, room_or_hall)
      `, { count: "exact" })
      .order("event_start_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    if (department_id) query = query.eq("primary_department_id", department_id);

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
    // Strip PK and timestamp fields — let Postgres assign them via BIGSERIAL/DEFAULT
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sessions, department_ids, organizer_ids, event_id: _eid, submitted_at: _sat, created_at: _cat, updated_at: _uat, ...eventData } = body;

    // Auto-generate event_code if blank
    if (!eventData.event_code) {
      const prefix = String(eventData.category || "EVT").slice(0, 3).toUpperCase();
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      eventData.event_code = `${prefix}-${year}-${rand}`;
    }

    // Insert event — BIGSERIAL assigns event_id automatically
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({ ...eventData })
      .select()
      .single();

    if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 });

    // Insert co-host departments if any
    if (department_ids?.length) {
      const deptRows = department_ids.map((dept: { id: number; role: string }) => ({
        event_id: event.event_id,
        department_id: dept.id,
        department_role: dept.role,
      }));
      await supabase.from("event_departments").insert(deptRows);
    }

    // Insert sessions if any
    if (sessions?.length) {
      const sessionRows = sessions.map((s: Record<string, unknown>) => ({ ...s, event_id: event.event_id }));
      await supabase.from("event_sessions").insert(sessionRows);
    }

    // Assign organizers if any
    if (organizer_ids?.length) {
      const orgRows = organizer_ids.map((o: { id: number; role: string; is_primary: boolean }) => ({
        event_id: event.event_id,
        organizer_id: o.id,
        responsibility_role: o.role,
        is_primary: o.is_primary || false,
      }));
      await supabase.from("event_organizers").insert(orgRows);
    }

    return NextResponse.json({ data: event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
