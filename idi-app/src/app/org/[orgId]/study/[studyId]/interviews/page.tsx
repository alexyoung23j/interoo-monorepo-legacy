import InterviewPageComponent from "@/app/_components/org/study/interviews/InterviewPageComponent";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";
import React from "react";

export default async function InterviewsPage({
  params,
}: {
  params: { orgId: string; studyId: string };
}) {
  const interviewData = await api.studies.getStudyInterviews({
    studyId: params.studyId,
  });

  if (!interviewData) {
    redirect("/404");
  }

  return <InterviewPageComponent interviewData={interviewData} />;
}
