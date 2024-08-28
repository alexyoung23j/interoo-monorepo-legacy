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
import { InterviewScreenLayout } from "./InterviewScreenLayout";

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
    <InterviewScreenLayout
      organization={organization}
      backgroundLight={backgroundLight}
      isLoading={interviewSessionLoading}
    >
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
            calculatedCurrentQuestion={calculatedCurrentQuestion!}
          />
        </div>
        {renderInterviewContent()}
      </>
    </InterviewScreenLayout>
  );
};
