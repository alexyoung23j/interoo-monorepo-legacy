"use client";

import React, { useState, useEffect } from "react";
import {
  InterviewSession,
  Organization,
  Study,
} from "@shared/generated/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getColorWithOpacity } from "@/app/utils/color";
import { Microphone } from "@phosphor-icons/react";
import { api } from "@/trpc/react";

export enum Stage {
  Intro = "intro",
  Form = "form",
  Access = "access",
}

interface InterviewStartContentProps {
  interviewSession: InterviewSession;
  organization: Organization;
  study: Study;
  refetchInterviewSession: () => void;
}

export const InterviewStartContent: React.FC<InterviewStartContentProps> = ({
  interviewSession,
  organization,
  study,
  refetchInterviewSession,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>(Stage.Intro);

  const startInterviewSession =
    api.interviews.startInterviewSessionQuestions.useMutation();

  useEffect(() => {
    const currentStage = searchParams.get("stage") as Stage;
    if (Object.values(Stage).includes(currentStage)) {
      setStage(currentStage);
    }
  }, [searchParams]);

  const updateStage = (newStage: Stage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("stage", newStage);
    router.push(`?${params.toString()}`);
  };

  const removeStage = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("stage");
    router.push(`?${params.toString()}`);
  };

  const renderContent = () => {
    switch (stage) {
      case Stage.Intro:
        return (
          <IntroContent
            study={study}
            organization={organization}
            onStart={() => updateStage(Stage.Access)}
          />
        );
      case Stage.Form:
        return <FormContent />;
      case Stage.Access:
        return (
          <AccessContent
            study={study}
            organization={organization}
            onGrantAccess={async () => {
              // todo actually grant access

              // Kick off the interview session by assigning the first question to CurrentQuestion
              await startInterviewSession.mutateAsync({
                interviewSessionId: interviewSession.id,
              });
              removeStage();
              refetchInterviewSession();
            }}
          />
        );
      default:
        return (
          <IntroContent
            study={study}
            organization={organization}
            onStart={() => updateStage(Stage.Access)}
          />
        );
    }
  };

  return (
    <div className="flex w-full items-center justify-center">
      {renderContent()}
      {/* Add navigation buttons or logic here */}
    </div>
  );
};

const IntroContent: React.FC<{
  study: Study;
  organization: Organization;
  onStart: () => void;
}> = ({ study, organization, onStart }) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );

  return (
    <div className="flex w-full max-w-[80%] flex-col gap-4 md:max-w-96">
      <div className="text-lg md:text-2xl">Welcome to {study.title}!</div>
      <div className="text-sm text-neutral-500 md:text-base">
        {study.welcomeDescription}
      </div>
      <div className="text-sm text-neutral-500 md:text-base">
        {study.termsAndConditions}
      </div>
      <div className="text-sm text-neutral-500 md:text-base">
        This interview should take ~
        <span className="font-bold text-neutral-700">
          {study.targetLength} minutes
        </span>
        .
      </div>
      <Button
        variant="unstyled"
        className={`mt-8 flex min-h-10 w-fit max-w-md gap-3 rounded-[1px] border border-black border-opacity-50 bg-[var(--button-bg)] text-black transition-colors hover:bg-[var(--button-hover-bg)]`}
        onClick={onStart}
        style={
          {
            "--button-bg": newColor,
            "--button-hover-bg": selectedColor,
          } as React.CSSProperties
        }
      >
        Get Started
      </Button>
    </div>
  );
};

// TODO: Decide when this should actulaly be used, leaving blank for now
// Involves a setting that requires they collect their name and email
const FormContent: React.FC = () => {
  return <div>{Stage.Form} Content</div>;
};

const AccessContent: React.FC<{
  study: Study;
  organization: Organization;
  onGrantAccess: () => void;
}> = ({ study, organization, onGrantAccess }) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );

  return (
    <div className="mb-10 flex w-full max-w-[70%] flex-col gap-4 md:max-w-[28rem]">
      <div className="text-lg">
        Please grant access to your {study.videoEnabled && "camera and"}{" "}
        microphone
      </div>
      <div className="text-sm text-neutral-500 md:text-base">
        Your responses are private and recorded only for our internal analysis.
      </div>
      <Button
        variant="unstyled"
        className={`mt-8 flex min-h-10 w-fit max-w-md gap-3 rounded-[1px] border border-black border-opacity-50 bg-[var(--button-bg)] text-black transition-colors hover:bg-[var(--button-hover-bg)]`}
        onClick={onGrantAccess}
        style={
          {
            "--button-bg": newColor,
            "--button-hover-bg": selectedColor,
          } as React.CSSProperties
        }
      >
        Allow Access <Microphone />
      </Button>
    </div>
  );
};
