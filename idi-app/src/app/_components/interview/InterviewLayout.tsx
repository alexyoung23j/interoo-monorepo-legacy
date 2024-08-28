"use client";

import React, { useCallback, useMemo } from "react";
import {
  FollowUpLevel,
  FollowUpQuestion,
  InterviewSession,
  InterviewSessionStatus,
  Organization,
  Question,
  QuestionType,
  Study,
} from "@shared/generated/client";
import type { BaseQuestionObject, CurrentQuestionType } from "@shared/types";
import Image from "next/image";
import { InterviewProgressBar } from "./InterviewProgressBar";
import { DisplayQuestion } from "./DisplayQuestion";
import InterviewBottomBar from "./InterviewBottomBar";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import ClipLoader from "react-spinners/ClipLoader";
import { InterviewStartContent } from "./setup/InterviewStartContent";
import { useConversationHistory } from "@/app/hooks/useConversationHistory";
import InterviewFinishedContent from "./setup/InterviewFinishedContent";

interface InterviewLayoutProps {
  study: Study & { questions: Question[] };
  organization: Organization;
  backgroundLight: boolean;
}

// TODO prolly move this to a shared directory

export const InterviewLayout: React.FC<InterviewLayoutProps> = ({
  study,
  organization,
  backgroundLight,
}) => {
  const params = useParams();
  const interviewSessionId = params.interviewSessionId as string;

  // This is the state for the entire interview
  const {
    data: interviewSessionData,
    isLoading: interviewSessionLoading,
    refetch: refetchInterviewSession,
  } = api.interviews.getInterviewSession.useQuery({
    interviewSessionId,
  });

  const { interviewSession, calculatedCurrentQuestion } =
    interviewSessionData ?? {};

  // Interview Phases
  const hasCurrentQuestion = calculatedCurrentQuestion !== null;

  const conversationHistory = useConversationHistory(study, interviewSession);

  const renderInterviewContent = () => {
    switch (interviewSession?.status) {
      case InterviewSessionStatus.IN_PROGRESS:
        return hasCurrentQuestion ? (
          <>
            <DisplayQuestion
              question={calculatedCurrentQuestion as Question}
              interviewSession={interviewSession as InterviewSession}
              organization={organization}
            />
            <InterviewBottomBar organization={organization} />
          </>
        ) : null;
      case InterviewSessionStatus.NOT_STARTED:
        return (
          <>
            <InterviewStartContent
              interviewSession={interviewSession as InterviewSession}
              organization={organization}
              study={study}
              refetchInterviewSession={refetchInterviewSession}
            />
            <div className="h-20"></div>
          </>
        );
      case InterviewSessionStatus.COMPLETED:
        return (
          <>
            <InterviewFinishedContent
              organization={organization}
              study={study}
              onFinish={() => {
                // TODO: decide what comes here
              }}
            />
            <div className="h-20"></div>
          </>
        );
      default:
        // TODO Some kind of error screen
        return (
          <>
            <InterviewStartContent
              interviewSession={interviewSession as InterviewSession}
              organization={organization}
              study={study}
              refetchInterviewSession={refetchInterviewSession}
            />
            <div className="h-20"></div>
          </>
        );
    }
  };

  return (
    <div
      className="relative flex h-screen items-center justify-center bg-org-primary px-4 pb-4 pt-16 md:px-32 md:py-24"
      style={
        {
          "--org-primary-color": organization.primaryColor,
          "--org-secondary-color": organization.secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="absolute top-4 flex w-full items-center justify-between px-4">
        <Image
          src={organization.logoUrl!}
          alt=""
          width={150}
          height={150}
          className="max-h-[100px] max-w-[100px] object-contain"
          unoptimized
        />
        <div
          className={`block cursor-pointer text-center text-sm font-medium opacity-30 md:hidden ${
            backgroundLight ? "text-black" : "text-white"
          }`}
          onClick={() => {
            // TODO: redirect to home page
          }}
        >
          Powered by ResearchEcho
        </div>
      </div>

      <div className="flex h-full w-full max-w-[1200px] flex-col items-center justify-between rounded-[2px] border-2 border-org-secondary bg-off-white">
        {interviewSessionLoading ? (
          <div className="flex h-full items-center justify-center">
            <ClipLoader
              color={organization.secondaryColor!}
              size={40}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : (
          <>
            <div className="flex w-full md:p-8">
              <InterviewProgressBar
                interviewSession={
                  interviewSession as InterviewSession & {
                    FollowUpQuestions: FollowUpQuestion[];
                  }
                }
                study={study}
                onNext={() => {
                  console.log("chill");
                }}
                onBack={() => {
                  console.log("chill");
                }}
                calculatedCurrentQuestion={
                  calculatedCurrentQuestion as CurrentQuestionType
                }
              />
            </div>
            {renderInterviewContent()}
          </>
        )}
      </div>
      <div
        className={`absolute bottom-10 left-0 right-0 hidden cursor-pointer text-center text-sm font-medium opacity-30 md:block ${
          backgroundLight ? "text-black" : "text-white"
        }`}
        onClick={() => {
          // TODO: redirect to home page
        }}
      >
        Powered by ResearchEcho
      </div>
    </div>
  );
};
