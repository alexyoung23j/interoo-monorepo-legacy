import StudiesPageComponent from "@/app/_components/org/studies/StudiesPageComponent";
import { api } from "@/trpc/server";
import React from "react";

export default async function StudiesPage({
  params,
}: {
  params: { orgId: string };
}) {
  const studies = await api.orgs.getOrgStudies({ orgId: params.orgId });
  return <StudiesPageComponent studies={studies} orgId={params.orgId} />;
}
