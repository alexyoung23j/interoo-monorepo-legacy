"use client";

import React, { useEffect } from "react";
import {
  FollowUpQuestion,
  InterviewSession,
  InterviewSessionStatus,
  Organization,
  Question,
  QuestionType,
  Study,
} from "@shared/generated/client";
import { InterviewProgressBar } from "./InterviewProgressBar";
import { DisplayQuestion } from "./DisplayQuestion";
import InterviewBottomBar from "./InterviewBottomBar";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { InterviewStartContent } from "./setup/InterviewStartContent";
import InterviewFinishedContent from "./setup/InterviewFinishedContent";
import { InterviewScreenLayout } from "./InterviewScreenLayout";
import { InterviewPerformContent } from "./InterviewPerformContent";
import {
  currentQuestionAtom,
  initializeInterviewAtom,
  interviewSessionAtom,
  responsesAtom,
} from "@/app/state/atoms";
import { useAtom } from "jotai";

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

  const [currentQuestion, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);
  const [, initializeInterview] = useAtom(initializeInterviewAtom);

  const { data, isLoading } = api.interviews.getInterviewSession.useQuery({
    interviewSessionId,
  });

  useEffect(() => {
    if (data) {
      const { interviewSession, calculatedCurrentQuestion } = data;
      setCurrentQuestion(calculatedCurrentQuestion ?? null);
      setResponses(interviewSession?.responses ?? []);
      setInterviewSession(interviewSession ?? null);
    }
  }, [data, setCurrentQuestion, setResponses, setInterviewSession]);

  useEffect(() => {
    initializeInterview(interviewSessionId);
  }, [interviewSessionId, initializeInterview]);

  console.log({ interviewSession });
  // Interview Phases
  const hasCurrentQuestion = currentQuestion !== null;

  const renderInterviewContent = () => {
    switch (interviewSession?.status) {
      case InterviewSessionStatus.IN_PROGRESS:
        return hasCurrentQuestion ? (
          <InterviewPerformContent
            organization={organization}
            study={study}
            refetchInterviewSession={() => {}}
            interviewSessionRefetching={false}
          />
        ) : null;
      case InterviewSessionStatus.NOT_STARTED:
        return (
          <>
            <InterviewStartContent
              organization={organization}
              study={study}
              refetchInterviewSession={() => {}}
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
              organization={organization}
              study={study}
              refetchInterviewSession={() => {}}
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
      isLoading={isLoading}
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
            calculatedCurrentQuestion={currentQuestion!}
          />
        </div>
        {renderInterviewContent()}
      </>
    </InterviewScreenLayout>
  );
};
