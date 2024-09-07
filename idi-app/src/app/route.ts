import { api } from "@/trpc/server";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = createClient();

  // Attempt to get the host from headers
  const host = request.headers.get("host") ?? requestUrl.host;
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const orgId = await api.orgs.getUserOrg();

  if (!orgId) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login`);
  }

  // Default to redirecting to studies
  return NextResponse.redirect(`${origin}/org/${orgId}/studies`);
}
