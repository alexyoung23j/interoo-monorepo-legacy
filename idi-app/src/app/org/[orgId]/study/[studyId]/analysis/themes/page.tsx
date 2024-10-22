import React from "react";
import ThemesPageComponent from "@/app/_components/org/study/analysis/themes/ThemesPageComponent";

export default function ThemesPage({
  params,
}: {
  params: { orgId: string; studyId: string };
}) {
  return <ThemesPageComponent studyId={params.studyId} orgId={params.orgId} />;
}
