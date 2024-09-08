import { api } from "@/trpc/server";
import React from "react";

export default async function DistributionPage({
  params,
}: {
  params: { orgId: string; studyId: string };
}) {
  const study = await api.studies.getStudy({
    studyId: params.studyId,
  });
  return (
    <div className="bg-theme-off-white h-full p-6">
      <h1 className="text-theme-800 mb-4 text-3xl font-bold">
        Distribution for {study?.title}
      </h1>
      <p className="text-theme-600">
        This is the Distribution page for the study. Here you can view and
        analyze the study results.
      </p>
    </div>
  );
}
