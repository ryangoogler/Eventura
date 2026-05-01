import { NextResponse } from "next/server";

// No-login mode: role is managed client-side via sessionStorage.
export async function GET() {
  return NextResponse.json({ user: null, profile: null });
}
