import { api } from "@/trpc/server";
import React from "react";
import DistributionPageComponent from "@/app/_components/org/study/distribution/DistributionPageComponent";
import { redirect } from "next/navigation";

export default async function DistributionPage({
  params,
}: {
  params: { orgId: string; studyId: string };
}) {
  return <DistributionPageComponent studyId={params.studyId} />;
}
