"use client";

import React, { useEffect, useState } from "react";
import {
  FollowUpQuestion,
  InterviewSession,
  InterviewSessionStatus,
  Organization,
  Question,
  QuestionType,
  Response,
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
  followUpQuestionsAtom,
  initializeInterviewAtom,
  interviewSessionAtom,
  responsesAtom,
} from "@/app/state/atoms";
import { useAtom } from "jotai";
import { CurrentQuestionType } from "@shared/types";

interface InterviewLayoutProps {
  study: Study & { questions: Question[] };
  organization: Organization;
  backgroundLight: boolean;
  fetchedInterviewSession: {
    interviewSession: InterviewSession & {
      FollowUpQuestions: FollowUpQuestion[];
      responses: Response[];
    };
    calculatedCurrentQuestion: CurrentQuestionType | null;
  };
}

export const InterviewLayout: React.FC<InterviewLayoutProps> = ({
  study,
  organization,
  backgroundLight,
  fetchedInterviewSession,
}) => {
  const params = useParams();
  const interviewSessionId = params.interviewSessionId as string;

  const [currentQuestion, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);
  const [followUpQuestions, setFollowUpQuestions] = useAtom(
    followUpQuestionsAtom,
  );

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (fetchedInterviewSession) {
      const { interviewSession: fetchedSession, calculatedCurrentQuestion } =
        fetchedInterviewSession;
      setInterviewSession(fetchedSession);
      setCurrentQuestion(calculatedCurrentQuestion ?? null);
      setResponses(fetchedSession.responses ?? []);
      setFollowUpQuestions(fetchedSession.FollowUpQuestions ?? []);
    }

    setIsLoading(false);
  }, [fetchedInterviewSession, interviewSessionId]);

  // Interview Phases
  const hasCurrentQuestion = currentQuestion !== null;

  const renderInterviewContent = () => {
    if (isLoading) {
      return <div>Loading...</div>;
    }

    switch (interviewSession?.status) {
      case InterviewSessionStatus.IN_PROGRESS:
        return hasCurrentQuestion ? (
          <InterviewPerformContent
            organization={organization}
            study={study}
            refetchInterviewSession={() => {}}
            interviewSessionRefetching={isLoading}
          />
        ) : null;
      case InterviewSessionStatus.NOT_STARTED:
        return (
          <>
            <InterviewStartContent
              organization={organization}
              study={study}
              refetchInterviewSession={() => {}}
              isLoading={isLoading}
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
              isLoading={isLoading}
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
