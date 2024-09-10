import { NextResponse } from "next/server";
import { api } from "@/trpc/server";
import { TRPCError } from "@trpc/server";

export async function GET(
  request: Request,
  { params }: { params: { shortenedStudyId: string } },
) {
  const shortenedStudyId = params.shortenedStudyId;
  const requestUrl = new URL(request.url);
  const testMode = requestUrl.searchParams.get("testMode") === "true";

  // Attempt to get the host from headers
  const host = request.headers.get("host") ?? requestUrl.host;
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  try {
    const interviewSession = await api.interviews.createInterviewSession({
      shortenedStudyId,
      testMode,
    });

    return NextResponse.redirect(
      `${origin}/study/${shortenedStudyId}/session/${interviewSession.id}`,
    );
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.message === "max-interviews-reached") {
        return NextResponse.redirect(
          `${origin}/study/${shortenedStudyId}/limit`,
        );
      }
    }

    console.error("Error creating interview session:", error, shortenedStudyId);
    // TODO: Redirect to a better page
    return NextResponse.redirect(`${origin}/404`);
  }
}
