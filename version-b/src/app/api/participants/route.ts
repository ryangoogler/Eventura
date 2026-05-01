import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const event_id = searchParams.get("event_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (event_id) {
      // Get participants registered for a specific event
      let query = supabase
        .from("registrations")
        .select(`
          *,
          participant:participants(*, department:departments(department_name)),
          team:teams(team_name)
        `, { count: "exact" })
        .eq("event_id", event_id)
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data, count });
    }

    let query = supabase
      .from("participants")
      .select("*, department:departments(department_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,roll_number.ilike.%${search}%,university_email.ilike.%${search}%`);
    }

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
    const { data, error } = await supabase
      .from("participants")
      .upsert(body, { onConflict: "university_email" })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
