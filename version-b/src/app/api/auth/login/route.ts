import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Fetch user role from our users table
    const { data: userRecord } = await supabase
      .from("users")
      .select("*, role:user_roles(role_name), department:departments(department_name)")
      .eq("email", email)
      .single();

    return NextResponse.json({
      user: data.user,
      session: data.session,
      profile: userRecord,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
