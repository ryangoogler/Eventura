import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(`*, participant:participants(*), event:events(*), team:teams(*)`)
    .eq("registration_id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const body = await request.json();
    const updateData: Record<string, unknown> = { ...body };
    if (body.registration_status === "confirmed") {
      updateData.confirmed_at = new Date().toISOString();
      updateData.eligibility_verified = true;
      updateData.verified_at = new Date().toISOString();
    }
    if (body.registration_status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("registrations")
      .update(updateData)
      .eq("registration_id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
