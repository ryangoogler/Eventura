import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// NOTE: createAdminClient is now synchronous (no await needed)

// POST /api/auth/setup-demo
// Call this ONCE after deploy to seed the three demo accounts.
// After calling it, this endpoint becomes a no-op if accounts already exist.

const DEMO_ACCOUNTS = [
  {
    email: "admin@eventura.demo",
    password: "Eventura@Admin1",
    full_name: "Demo Admin",
    role_name: "admin",
  },
  {
    email: "organiser@eventura.demo",
    password: "Eventura@Org1",
    full_name: "Demo Organiser",
    role_name: "organiser",
  },
  {
    email: "participant@eventura.demo",
    password: "Eventura@Part1",
    full_name: "Demo Participant",
    role_name: "participant",
  },
];

export async function POST() {
  try {
    // createAdminClient is now synchronous
    const adminClient = createAdminClient();

    // Fetch all roles
    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("role_id, role_name");

    if (rolesError || !roles?.length) {
      return NextResponse.json(
        { error: "Roles not found. Run supabase-setup.sql in your Supabase SQL Editor first." },
        { status: 500 }
      );
    }

    const roleMap: Record<string, number> = {};
    for (const r of roles) roleMap[r.role_name] = r.role_id;

    const results = [];

    for (const account of DEMO_ACCOUNTS) {
      // Check if auth user already exists
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existingAuthUser = listData?.users?.find(u => u.email === account.email);

      let authUserId: string | null = existingAuthUser?.id ?? null;

      if (!existingAuthUser) {
        // Create auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: { full_name: account.full_name },
        });

        if (authError) {
          results.push({ email: account.email, status: `auth error: ${authError.message}` });
          continue;
        }
        authUserId = authData.user.id;
      }

      // Check if users table row exists (by email — idempotent regardless of auth state)
      const { data: existingRow } = await adminClient
        .from("users")
        .select("user_id")
        .eq("email", account.email)
        .maybeSingle();

      if (existingRow) {
        results.push({ email: account.email, status: "already exists — skipped" });
        continue;
      }

      // Insert into users table
      const role_id = roleMap[account.role_name];
      const { error: dbError } = await adminClient
        .from("users")
        .insert({ full_name: account.full_name, email: account.email, role_id });

      if (dbError) {
        // Roll back auth user only if we just created it
        if (!existingAuthUser && authUserId) {
          await adminClient.auth.admin.deleteUser(authUserId);
        }
        results.push({ email: account.email, status: `db error: ${dbError.message}` });
        continue;
      }

      results.push({ email: account.email, status: existingAuthUser ? "users row created (auth already existed)" : "created" });
    }

    return NextResponse.json({
      message: "Demo setup complete.",
      accounts: DEMO_ACCOUNTS.map(a => ({
        role: a.role_name,
        email: a.email,
        password: a.password,
      })),
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
