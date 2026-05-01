import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if auth user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some(u => u.email === email);
    if (alreadyExists) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Get participant role_id
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role_id")
      .eq("role_name", "participant")
      .single();

    if (!roleRow) {
      // Roles not seeded yet — rollback auth user and tell them
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Database roles not set up yet. Run supabase-setup.sql in your Supabase SQL Editor first." },
        { status: 500 }
      );
    }

    // Insert into users table
    const { error: dbError } = await adminClient
      .from("users")
      .insert({ full_name, email, role_id: roleRow.role_id });

    if (dbError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Account created successfully." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
