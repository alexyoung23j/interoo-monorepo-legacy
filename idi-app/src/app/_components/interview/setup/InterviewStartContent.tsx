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
import ClipLoader from "react-spinners/ClipLoader";

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
  const [isInitializing, setIsInitializing] = useState(false);

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
            isInitializing={isInitializing}
            onGrantAccess={async () => {
              setIsInitializing(true);
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
  isInitializing: boolean;
  onGrantAccess: () => void;
}> = ({ study, organization, isInitializing, onGrantAccess }) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );
  const [accessError, setAccessError] = useState<string | null>(null);

  const [showInstructions, setShowInstructions] = useState(false);

  const browserInstructions = () => {
    const isChrome = navigator.userAgent.indexOf("Chrome") > -1;
    const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
    const isSafari = navigator.userAgent.indexOf("Safari") > -1 && !isChrome;

    if (isChrome) {
      return (
        <ol className="list-decimal pl-5 text-sm">
          <li>Click the lock icon in the address bar</li>
          <li>Select "Site settings"</li>
          <li>Change the camera and microphone permissions to "Allow"</li>
          <li>Refresh the page</li>
        </ol>
      );
    } else if (isFirefox) {
      return (
        <ol className="list-decimal pl-5 text-sm">
          <li>Click the shield icon in the address bar</li>
          <li>Click "Site Information"</li>
          <li>Change the camera and microphone permissions to "Allow"</li>
          <li>Refresh the page</li>
        </ol>
      );
    } else if (isSafari) {
      return (
        <ol className="list-decimal pl-5 text-sm">
          <li>Open Safari Preferences</li>
          <li>Go to the "Websites" tab</li>
          <li>Find "Camera" and "Microphone" in the left sidebar</li>
          <li>Locate this website and set permissions to "Allow"</li>
          <li>Refresh the page</li>
        </ol>
      );
    } else {
      return (
        <p className="text-sm">
          Please check your browser settings to allow camera and microphone
          access for this site.
        </p>
      );
    }
  };

  const handleGrantAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: study.videoEnabled ?? false,
      });
      onGrantAccess();
    } catch (error) {
      console.error("Error accessing camera and microphone:", error);
      setAccessError(
        "Please allow access to continue. You can change this in your browser settings.",
      );
    }
  };

  return (
    <div className="mb-10 flex w-full max-w-[70%] flex-col gap-4 md:max-w-[28rem]">
      <div className="text-lg">
        Please grant access to your {study.videoEnabled && "camera and"}{" "}
        microphone
      </div>
      <div className="text-sm text-neutral-500 md:text-base">
        Your responses are private and recorded only for our internal analysis.
      </div>
      {accessError && (
        <div className="text-sm text-red-500">
          {accessError}
          <button
            className="ml-2 text-blue-500 underline"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            {showInstructions ? "Hide instructions" : "Show instructions"}
          </button>
        </div>
      )}
      {showInstructions && (
        <div className="mt-2 rounded bg-gray-100 p-3">
          {browserInstructions()}
        </div>
      )}
      <Button
        variant="unstyled"
        className={`mt-8 flex min-h-10 w-fit max-w-md gap-3 rounded-[1px] border border-black border-opacity-50 bg-[var(--button-bg)] text-black transition-colors hover:bg-[var(--button-hover-bg)]`}
        onClick={handleGrantAccess}
        style={
          {
            "--button-bg": newColor,
            "--button-hover-bg": selectedColor,
          } as React.CSSProperties
        }
      >
        {isInitializing ? (
          <ClipLoader
            color="#000000"
            size={20}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
        ) : (
          <>
            "Allow Access" <Microphone />
          </>
        )}
      </Button>
    </div>
  );
};
