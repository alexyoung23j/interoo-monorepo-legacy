"use client";

import TitleLayout from "@/app/_components/layouts/org/TitleLayout";
import { Button } from "@/components/ui/button";
import { DotsThree, Plus } from "@phosphor-icons/react";
import { Study, StudyStatus } from "@shared/generated/client";
import React, { useMemo, useState } from "react";
import CardTable from "../../reusable/CardTable";
import BasicTag from "../../reusable/BasicTag";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { ClipLoader } from "react-spinners";

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
  const router = useRouter();
  const [isCreatingBlankStudy, setIsCreatingBlankStudy] = useState(false);
  const createBlankStudyMutation = api.studies.createBlankStudy.useMutation();

  const formattedData = useMemo(() => {
    return studies.map((study) => ({
      id: study.id,
      numResponses: study.completedInterviewsCount,
      isDraft: study.status === StudyStatus.DRAFT,
      name: <div className="font-semibold text-theme-700">{study.title}</div>,
      lastUpdated: (
        <div className="text-xs text-theme-700">
          {new Date(study.mostRecentUpdate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      ),
      responses: (
        <div className="text-xs text-theme-700">
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

  return (
    <TitleLayout
      title="Studies"
      rightElement={
        <Button
          className="flex gap-2 text-theme-off-white"
          onClick={async () => {
            setIsCreatingBlankStudy(true);
            const newStudy = await createBlankStudyMutation.mutateAsync({
              organizationId: orgId,
            });
            setIsCreatingBlankStudy(false);
            router.push(`/org/${orgId}/study/${newStudy.id}/setup/overview`);
          }}
        >
          {isCreatingBlankStudy ? (
            <ClipLoader size={16} color="white" />
          ) : (
            <Plus className="text-theme-off-white" />
          )}
          Create New
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <CardTable
          data={formattedData}
          columns={columns}
          onRowClick={(row) => {
            if (row.isDraft) {
              router.push(`/org/${orgId}/study/${row.id}/setup/overview`);
            } else {
              if (row.numResponses > 0) {
                router.push(`/org/${orgId}/study/${row.id}/results`);
              } else {
                router.push(`/org/${orgId}/study/${row.id}/distribution`);
              }
            }
          }}
          tableClassName="w-full"
        />
      </div>
    </TitleLayout>
  );
}
