import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (request.nextUrl.pathname.startsWith("/org") && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/org/:path*"],
};
