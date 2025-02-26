"use client";

import React, { useState } from "react";
import type {
  Organization,
  Study,
  DemographicQuestionConfiguration,
} from "@shared/generated/client";
import { Button } from "@/components/ui/button";
import { getColorWithOpacity } from "@/app/utils/color";
import { ArrowRight, Microphone } from "@phosphor-icons/react";
import { api } from "@/trpc/react";
import ClipLoader from "react-spinners/ClipLoader";
import {
  currentQuestionAtom,
  interviewSessionAtom,
  mediaAccessAtom,
} from "@/app/state/atoms";
import { useAtom, useAtomValue } from "jotai";
import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import { isIOSDevice } from "@/app/utils/functions";

export enum Stage {
  Intro = "intro",
  Form = "form",
  Access = "access",
}

interface ExtendedStudy extends Study {
  demographicQuestionConfiguration: DemographicQuestionConfiguration | null;
}

interface InterviewStartContentProps {
  organization: Organization;
  study: ExtendedStudy;
  stage: Stage;
  setStage: (stage: Stage) => void;
  onStartInterview: () => void;
  playTtsAudio: (text: string) => Promise<void>;
  stopTtsAudio: () => void;
}

export const InterviewStartContent: React.FC<InterviewStartContentProps> = ({
  organization,
  study,
  stage,
  setStage,
  onStartInterview,
  playTtsAudio,
  stopTtsAudio,
}) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [, setInterviewSession] = useAtom(interviewSessionAtom);
  const interviewSession = useAtomValue(interviewSessionAtom);
  const [, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [mediaAccess, setMediaAccess] = useAtom(mediaAccessAtom);

  const [accessError, setAccessError] = useState<string | null>(null);

  const startInterviewSession =
    api.interviews.startInterviewSessionQuestions.useMutation();

  const startInterview = async () => {
    setIsInitializing(true);
    try {
      const firstQuestion = await startInterviewSession.mutateAsync({
        interviewSessionId: interviewSession?.id ?? "",
      });
      setCurrentQuestion(firstQuestion);
      setInterviewSession({
        ...interviewSession!,
        status: "NOT_STARTED",
      });
      onStartInterview(); //simply updates progress state

      // Only play TTS if not on iOS
      if (!isIOSDevice()) {
        playTtsAudio(firstQuestion.title).catch((error) => {
          console.error("Error playing TTS audio:", error);
        });
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      setAccessError(
        "An error occurred while starting the interview. Please try again.",
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const renderContent = () => {
    switch (stage) {
      case Stage.Intro:
        return (
          <IntroContent
            study={study}
            organization={organization}
            onStart={() =>
              setStage(
                study.demographicQuestionConfiguration &&
                  !interviewSession?.testMode
                  ? Stage.Form
                  : Stage.Access,
              )
            }
          />
        );
      case Stage.Form:
        return (
          <FormContent
            study={study}
            organization={organization}
            onNext={() => setStage(Stage.Access)}
            interviewSessionId={interviewSession?.id ?? ""}
          />
        );
      case Stage.Access:
        return mediaAccess.microphone &&
          (mediaAccess.camera || !study.videoEnabled) ? (
          <BeginContent
            study={study}
            organization={organization}
            isInitializing={isInitializing}
            accessError={accessError}
            handleStart={startInterview}
          />
        ) : (
          <AccessContent
            study={study}
            organization={organization}
            isInitializing={isInitializing}
            accessError={accessError}
            handleGrantAccess={async () => {
              setIsInitializing(true);
              try {
                await navigator.mediaDevices.getUserMedia({
                  audio: true,
                  video: study.videoEnabled ?? false,
                });
                setMediaAccess({
                  microphone: true,
                  camera: study.videoEnabled ?? false,
                });
                // After granting access, we move to the BeginContent
                setStage(Stage.Access);
              } catch (error) {
                console.error("Error accessing camera and microphone:", error);
                setAccessError(
                  "Please allow access to continue. You can change this in your browser settings.",
                );
              } finally {
                setIsInitializing(false);
              }
            }}
          />
        );
      default:
        return (
          <IntroContent
            study={study}
            organization={organization}
            onStart={() =>
              setStage(
                study.demographicQuestionConfiguration &&
                  !interviewSession?.testMode
                  ? Stage.Form
                  : Stage.Access,
              )
            }
          />
        );
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      {renderContent()}
    </div>
  );
};

const IntroContent: React.FC<{
  study: ExtendedStudy;
  organization: Organization;
  onStart: () => void;
}> = ({ study, organization, onStart }) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );

  return (
    <div className="flex max-h-[80%] w-full max-w-[80%] flex-col gap-4 overflow-y-auto pb-10 md:max-h-full md:max-w-[30rem]">
      <div className="text-lg md:text-2xl">{study.title}</div>
      <div className="flex h-full w-full flex-col gap-4 overflow-y-auto pr-10">
        <div className="text-sm text-neutral-500 md:text-base">
          {study.welcomeDescription}
        </div>
        <div className="text-sm text-neutral-500 md:text-base">
          {study.termsAndConditions}
        </div>
        {study.targetLength && (
          <div className="text-sm text-neutral-500 md:text-base">
            This interview should take ~
            <span className="font-bold text-neutral-700">
              {study.targetLength} minutes
            </span>
            .
          </div>
        )}
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
        {`Let's go!`}
      </Button>
    </div>
  );
};

const FormContent: React.FC<{
  study: ExtendedStudy;
  organization: Organization;
  onNext: () => void;
  interviewSessionId: string;
}> = ({ study, organization, onNext, interviewSessionId }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    phoneNumber?: string;
  }>({});

  const upsertDemographicResponse =
    api.demographics.upsertDemographicResponse.useMutation();

  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );

  const validateEmail = (email: string) => {
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // return emailRegex.test(email);
    return true;
  };

  const validatePhoneNumber = (phoneNumber: string) => {
    // const phoneRegex = /^\+?[\d\s()-]{7,}$/;
    // return phoneRegex.test(phoneNumber);
    return true;
  };

  const isFormValid = () => {
    const {
      name: nameRequired,
      email: emailRequired,
      phoneNumber: phoneRequired,
    } = study.demographicQuestionConfiguration ?? {};

    if (nameRequired && name === "") return false;
    if (emailRequired && email === "") return false;
    if (phoneRequired && phoneNumber === "") return false;

    return true;
  };

  const handleNext = async () => {
    const newErrors: { email?: string; phoneNumber?: string } = {};

    if (
      study.demographicQuestionConfiguration?.email &&
      email &&
      !validateEmail(email)
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    if (
      study.demographicQuestionConfiguration?.phoneNumber &&
      phoneNumber &&
      !validatePhoneNumber(phoneNumber)
    ) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      if (study.demographicQuestionConfiguration) {
        await upsertDemographicResponse.mutateAsync({
          interviewSessionId,
          name: study.demographicQuestionConfiguration.name ? name : undefined,
          email: study.demographicQuestionConfiguration.email
            ? email
            : undefined,
          phoneNumber: study.demographicQuestionConfiguration.phoneNumber
            ? phoneNumber
            : undefined,
        });
      }
      onNext();
    }
  };

  return (
    <div className="flex w-full max-w-[80%] flex-col gap-4 md:max-w-96">
      <BasicTitleSection
        title="Let's start by collecting some information about you."
        subtitle="This information helps us understand our participants better."
      >
        <div className="space-y-4">
          {study.demographicQuestionConfiguration?.name && (
            <BasicInput
              value={name}
              onSetValue={setName}
              placeholder="Enter your name"
            />
          )}
          {study.demographicQuestionConfiguration?.email && (
            <div>
              <BasicInput
                value={email}
                onSetValue={setEmail}
                placeholder="Enter your email"
                type="email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-theme-900">{errors.email}</p>
              )}
            </div>
          )}
          {study.demographicQuestionConfiguration?.phoneNumber && (
            <div>
              <BasicInput
                value={phoneNumber}
                onSetValue={setPhoneNumber}
                placeholder="Enter your phone number"
                type="tel"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-theme-900">
                  {errors.phoneNumber}
                </p>
              )}
            </div>
          )}
        </div>
      </BasicTitleSection>
      <Button
        variant="unstyled"
        className={`mt-8 flex min-h-10 w-fit max-w-md gap-3 rounded-[1px] border border-black border-opacity-50 bg-[var(--button-bg)] text-black transition-colors hover:bg-[var(--button-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50`}
        onClick={handleNext}
        disabled={!isFormValid()}
        style={
          {
            "--button-bg": newColor,
            "--button-hover-bg": selectedColor,
          } as React.CSSProperties
        }
      >
        Next <ArrowRight />
      </Button>
    </div>
  );
};

const AccessContent: React.FC<{
  study: ExtendedStudy;
  organization: Organization;
  isInitializing: boolean;
  handleGrantAccess: () => void;
  accessError: string | null;
}> = ({
  study,
  organization,
  isInitializing,
  handleGrantAccess,
  accessError,
}) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );

  const [showInstructions, setShowInstructions] = useState(false);

  const browserInstructions = () => {
    const isChrome = navigator.userAgent.includes("Chrome");
    const isFirefox = navigator.userAgent.includes("Firefox");
    const isSafari = navigator.userAgent.includes("Safari") && !isChrome;

    if (isChrome) {
      return (
        <ol className="list-decimal pl-5 text-sm">
          <li>Click the lock icon in the address bar</li>
          <li>Select &quot;Site settings&quot;</li>
          <li>
            Change the camera and microphone permissions to &quot;Allow&quot;
          </li>
          <li>Refresh the page</li>
        </ol>
      );
    } else if (isFirefox) {
      return (
        <ol className="list-decimal pl-5 text-sm">
          <li>Click the shield icon in the address bar</li>
          <li>Click &quot;Site Information&quot;</li>
          <li>
            Change the camera and microphone permissions to &quot;Allow&quot;
          </li>
          <li>Refresh the page</li>
        </ol>
      );
    } else if (isSafari) {
      return (
        <ol className="list-decimal pl-5 text-sm">
          <li>Open Safari Preferences</li>
          <li>Go to the &quot;Websites&quot; tab</li>
          <li>
            Find &quot;Camera&quot; and &quot;Microphone&quot; in the left
            sidebar
          </li>
          <li>Locate this website and set permissions to &quot;Allow&quot;</li>
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
          <>
            Getting ready...{" "}
            <ClipLoader
              color="#000000"
              size={20}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </>
        ) : (
          <>
            Allow Access <Microphone />
          </>
        )}
      </Button>
    </div>
  );
};

const BeginContent: React.FC<{
  study: ExtendedStudy;
  organization: Organization;
  isInitializing: boolean;
  handleStart: () => void;
  accessError: string | null;
}> = ({ study, organization, isInitializing, handleStart, accessError }) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );

  return (
    <div className="mb-10 flex w-full max-w-[70%] flex-col gap-4 md:max-w-[28rem]">
      <div className="text-lg">
        Your responses are private and recorded only for our internal analysis.
      </div>{" "}
      <div className="text-sm text-neutral-500 md:text-base">
        Have a great interview!
      </div>
      <Button
        variant="unstyled"
        className={`mt-8 flex min-h-10 w-fit max-w-md gap-3 rounded-[1px] border border-black border-opacity-50 bg-[var(--button-bg)] text-black transition-colors hover:bg-[var(--button-hover-bg)]`}
        onClick={handleStart}
        style={
          {
            "--button-bg": newColor,
            "--button-hover-bg": selectedColor,
          } as React.CSSProperties
        }
      >
        {isInitializing ? (
          <>
            Getting ready...{" "}
            <ClipLoader
              color="#000000"
              size={20}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </>
        ) : (
          <>
            Get Started <ArrowRight />
          </>
        )}
      </Button>
    </div>
  );
};
