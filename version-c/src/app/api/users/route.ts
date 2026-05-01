import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    let query = supabase
      .from("users")
      .select("*, role:user_roles(role_name), department:departments(department_name)")
      .order("created_at", { ascending: false });

    if (role) query = query.eq("role_id", role);

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
    const { email, password, full_name, role_id, department_id, phone } = body;

    // Create auth user via admin client
    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    // Insert into users table
    const { data, error } = await supabase
      .from("users")
      .insert({ full_name, email, phone, role_id, department_id })
      .select("*, role:user_roles(role_name), department:departments(department_name)")
      .single();

    if (error) {
      // Rollback auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { user_id, ...updates } = body;

    const { data, error } = await supabase
      .from("users")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .select("*, role:user_roles(role_name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
