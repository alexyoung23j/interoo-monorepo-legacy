import InterviewPageComponent from "@/app/_components/org/study/interviews/InterviewPageComponent";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";
import React from "react";

export default async function InterviewsPage({
  params,
}: {
  params: { orgId: string; studyId: string };
}) {
  return (
    <InterviewPageComponent studyId={params.studyId} orgId={params.orgId} />
  );
}
