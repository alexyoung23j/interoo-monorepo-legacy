"use client";

import TitleLayout from "@/app/_components/layouts/org/TitleLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react";
import { Study } from "@shared/generated/client";
import React, { useMemo } from "react";
import CardTable from "../../reusable/CardTable";
import BasicTag from "../../reusable/BasicTag";
import { useRouter } from "next/navigation";

const columns = [
  { key: "name", header: "Study Name", width: "65%" },
  { key: "lastUpdated", header: "Last Updated" },
  { key: "responses", header: "Responses" },
  { key: "status", header: "Status" },
];

export default function StudiesPageComponent({
  studies,
  orgId,
}: {
  studies: (Study & {
    completedInterviewsCount: number;
    mostRecentUpdate: Date;
  })[];
  orgId: string;
}) {
  const formattedData = useMemo(() => {
    return studies.map((study) => ({
      id: study.id,
      name: <div className="text-theme-700 font-semibold">{study.title}</div>,
      lastUpdated: (
        <div className="text-theme-700 text-xs">
          {new Date(study.mostRecentUpdate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      ),
      responses: (
        <div className="text-theme-700 text-xs">
          {study.completedInterviewsCount}
        </div>
      ),
      status: (
        <BasicTag
          color={study.status === "PUBLISHED" ? "bg-theme-100" : "bg-theme-50"}
        >
          {study.status === "PUBLISHED" ? "Published" : "Draft"}
        </BasicTag>
      ),
    }));
  }, [studies]);

  const router = useRouter();

  return (
    <TitleLayout
      title="Studies"
      rightElement={
        <Button className="text-theme-off-white flex cursor-not-allowed gap-2">
          <Plus className="text-theme-off-white" />
          Create New
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <CardTable
          data={formattedData}
          columns={columns}
          onRowClick={(row) => {
            router.push(`/org/${orgId}/study/${row.id}/distribution`);
          }}
          tableClassName="w-full"
        />
      </div>
    </TitleLayout>
  );
}
