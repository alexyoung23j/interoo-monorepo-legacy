"use client";
import { BasicLinkCopy } from "@/app/_components/reusable/BasicLinkCopy";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import { showErrorToast, showSuccessToast } from "@/app/utils/toastUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { Study, StudyStatus } from "@shared/generated/client";
import React, { useEffect, useState } from "react";

interface DistributionPageComponentProps {
  study: Study;
}

const DistributionPageComponent: React.FC<DistributionPageComponentProps> = ({
  study,
}) => {
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
          id: study?.id,
          maxResponses: maxParticipants,
        });
        showSuccessToast("Max participants updated.");
      }
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to update study.");
    }
  };

  return (
    <div className="bg-theme-off-white flex h-full flex-col gap-20 p-9">
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
          <Input
            type="number"
            placeholder="enter number"
            value={maxParticipants?.toString() ?? ""}
            onChange={(e) => {
              setMaxParticipants(parseInt(e.target.value));
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
