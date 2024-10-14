"use client";
import BasicInput from "@/app/_components/reusable/BasicInput";
import { BasicLinkCopy } from "@/app/_components/reusable/BasicLinkCopy";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import { showErrorToast, showSuccessToast } from "@/app/utils/toastUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { Study, StudyStatus } from "@shared/generated/client";
import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";

interface DistributionPageComponentProps {
  studyId: string;
}

const DistributionPageComponent: React.FC<DistributionPageComponentProps> = ({
  studyId,
}) => {
  const { data: study, isLoading } = api.studies.getStudy.useQuery(
    {
      studyId: studyId,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading || !study) {
    return (
      <div className="flex h-full items-center justify-center bg-theme-off-white">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-20 bg-theme-off-white p-9">
      <BasicTitleSection
        title="Share"
        subtitle="Send this link to your survey participants."
      >
        <div className="w-fit">
          <BasicLinkCopy
            link={`${window.location.origin}/study/${study?.shortID}`}
          />
        </div>
      </BasicTitleSection>
    </div>
  );
};

export default DistributionPageComponent;
