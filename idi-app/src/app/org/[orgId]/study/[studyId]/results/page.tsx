import ResultsPageComponent, {
  ExtendedStudy,
} from "@/app/_components/org/study/distribution/results/ResultsPageComponent";
import { api } from "@/trpc/server";
import { Question } from "@shared/generated/client";
import { redirect } from "next/navigation";
import React from "react";

export default async function ResultsPage({
  params,
}: {
  params: { orgId: string; studyId: string };
}) {
  const study = await api.studies.getStudy({
    studyId: params.studyId,
    includeQuestions: true,
  });

  if (!study) {
    redirect("/404");
  }

  return <ResultsPageComponent study={study} />;
}
