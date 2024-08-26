import { InterviewPage } from "@/app/_components/interview/InterviewLayout";
import { api } from "@/trpc/server";

export default async function InterviewSessionPage({
  params,
}: {
  params: { shortenedStudyId: string; interviewSessionId: string };
}) {
  const { shortenedStudyId, interviewSessionId } = params;

  const { study, organization } = await api.studies.getStudyDetails({
    shortenedStudyId: shortenedStudyId as string,
  });

  if (!organization) {
    return <div>Organization not found</div>;
  }

  return <InterviewPage study={study} organization={organization} />;
}
