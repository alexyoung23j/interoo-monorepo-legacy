import { api } from "@/trpc/server";
import React from "react";
import DistributionPageComponent from "@/app/_components/org/study/distribution/DistributionPageComponent";
import { redirect } from "next/navigation";

export default async function DistributionPage({
  params,
}: {
  params: { orgId: string; studyId: string };
}) {
  const study = await api.studies.getStudy({
    studyId: params.studyId,
  });

  if (!study) {
    redirect("/404");
  }
  return <DistributionPageComponent study={study} />;
}
