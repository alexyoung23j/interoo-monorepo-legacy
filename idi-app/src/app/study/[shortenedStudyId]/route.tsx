import { NextResponse } from "next/server";
import { api } from "@/trpc/server";

export async function GET(
  request: Request,
  { params }: { params: { shortenedStudyId: string } },
) {
  const shortenedStudyId = params.shortenedStudyId;
  const requestUrl = new URL(request.url);

  // Attempt to get the host from headers
  const host = request.headers.get("host") ?? requestUrl.host;
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  try {
    const interviewSession = await api.interviews.createInterviewSession({
      shortenedStudyId,
    });

    return NextResponse.redirect(
      `${origin}/study/${shortenedStudyId}/session/${interviewSession.id}?stage=intro`,
    );
  } catch (error) {
    console.error("Error creating interview session:", error);
    // TODO: Redirect to a better page
    return NextResponse.redirect(`${origin}/404`);
  }
}
