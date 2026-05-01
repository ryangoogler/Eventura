import { type NextRequest, NextResponse } from "next/server";

// No-login mode: all routes are open. Role is managed client-side via localStorage.
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
