import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  // Attempt to get the host from headers
  const host = request.headers.get("host") || requestUrl.host;
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  console.log({
    code,
    origin,
    next,
    requestUrl,
    headers: Object.fromEntries(request.headers),
  });

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // URL to redirect to after sign up process completes
  return NextResponse.redirect(`${origin}/test`);
}
