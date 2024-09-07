import { api } from "@/trpc/server";
import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { inviteToken: string } },
) {
  const { inviteToken } = params;
  const requestUrl = new URL(request.url);
  // Get the host from headers
  const host = request.headers.get("host") ?? requestUrl.host;
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  try {
    const { organization } = await api.orgs.validateAndAcceptInvite({
      inviteToken: inviteToken,
    });

    return NextResponse.redirect(`${origin}/org/${organization.id}/studies`);
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.message === "User already has a profile") {
        return NextResponse.redirect(
          `${origin}/invite/error?error=user-already-has-profile`,
        );
      }
    }

    if (error instanceof TRPCError) {
      if (
        error.message === "Invite has expired" ||
        error.message === "Invite not found" ||
        error.message === "Invite has already been used"
      ) {
        return NextResponse.redirect(
          `${origin}/invite/error?error=invite-invalid`,
        );
      }
    }
    console.error(error);
    return NextResponse.redirect(`${origin}/invite/error?error=unknown-error`);
  }
}
