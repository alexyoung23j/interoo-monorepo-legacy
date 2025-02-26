import { InterviewLayout } from "@/app/_components/interview/InterviewLayout";
import { api } from "@/trpc/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isColorLight } from "@/app/utils/color";

/**
 * @description This is the server component for the interview session page that fetches the static data needed for the interview setup.
 * @param param0
 * @returns
 */
export default async function InterviewSessionServerPage({
  params,
}: {
  params: { shortenedStudyId: string; interviewSessionId: string };
}) {
  const { shortenedStudyId, interviewSessionId } = params;

  const { study, organization } = await api.studies.getStudyDetails({
    shortenedStudyId: shortenedStudyId,
  });

  const interviewSession = await api.interviews.getInterviewSession({
    interviewSessionId: interviewSessionId,
  });

  // End any existing pause intervals
  await api.interviews.setPauseIntervals({
    interviewSessionId: interviewSessionId,
    action: "END_PAUSE",
  });

  // Get the host from headers
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  if (!organization || !interviewSession || !study) {
    return redirect(`${origin}/404`);
  }

  const isLight = isColorLight(organization.primaryColor ?? "");

  return (
    <InterviewLayout
      study={study}
      organization={organization}
      backgroundLight={isLight}
      fetchedInterviewSession={interviewSession}
    />
  );
}
