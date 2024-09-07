import { api } from "@/trpc/server";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const supabase = createClient();

  // Attempt to get the host from headers
  const host = request.headers.get("host") ?? requestUrl.host;
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const orgId = await api.orgs.getUserOrg();

  if (!orgId) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/invite/error/missingOrg`);
  }

  // Default to redirecting to studies
  return NextResponse.redirect(`${origin}/org/${orgId}/studies`);
}
