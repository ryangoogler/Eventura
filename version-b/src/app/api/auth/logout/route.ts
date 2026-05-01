import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createAdminClient();
    await supabase.auth.signOut();
    return NextResponse.json({ message: "Logged out successfully" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
