import FavoritesPageComponent from "@/app/_components/org/study/favorites/FavoritesPageComponent";
import React from "react";

export default async function FavoritesPage({
  params,
}: {
  params: { orgId: string; studyId: string };
}) {
  return (
    <FavoritesPageComponent studyId={params.studyId} orgId={params.orgId} />
  );
}
