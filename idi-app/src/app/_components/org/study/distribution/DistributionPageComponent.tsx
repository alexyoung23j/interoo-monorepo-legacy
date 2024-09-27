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

  const [maxParticipants, setMaxParticipants] = useState<number | null>(null);
  const [hasChangedMaxParticipants, setHasChangedMaxParticipants] =
    useState(false);

  const updateStudy = api.studies.updateStudy.useMutation();

  useEffect(() => {
    if (study?.maxResponses) {
      setMaxParticipants(study.maxResponses);
    }
  }, [study]);

  const handleSave = async () => {
    try {
      if (maxParticipants) {
        setHasChangedMaxParticipants(false);
        await updateStudy.mutateAsync({
          id: study?.id ?? "",
          maxResponses: maxParticipants,
        });
        showSuccessToast("Max participants updated.");
      }
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to update study.");
    }
  };

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
        <BasicLinkCopy
          link={`${window.location.origin}/study/${study?.shortID}`}
        />
      </BasicTitleSection>
      <BasicTitleSection
        title="Maximum Participants"
        subtitle="The survey will no longer accept responses after this
        number has been reached."
      >
        <div className="flex max-w-72 items-center gap-4">
          <BasicInput
            type="number"
            placeholder="enter number"
            value={maxParticipants ?? ""}
            onSetValue={(value) => {
              const parsedValue = parseInt(value);
              setMaxParticipants(isNaN(parsedValue) ? null : parsedValue);
              setHasChangedMaxParticipants(true);
            }}
            disabled={study?.status === StudyStatus.PUBLISHED}
          />
          <Button
            size="sm"
            className="text-theme-off-white"
            disabled={!hasChangedMaxParticipants}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </BasicTitleSection>
    </div>
  );
};

export default DistributionPageComponent;
