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
  mediaAccessAtom,
  responsesAtom,
} from "@/app/state/atoms";
import { useAtom } from "jotai";
import { CurrentQuestionType } from "@shared/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Stage } from "./setup/InterviewStartContent";

interface InterviewLayoutProps {
  study: Study & {
    questions: Question[];
    boostedKeywords: {
      id: string;
      keyword: string;
      definition: string | null;
      studyId: string;
    }[];
  };
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const interviewSessionId = params.interviewSessionId as string;

  // Local state for initial stages
  const [localStage, setLocalStage] = useState<Stage>(Stage.Intro);

  // URL param for interview progress
  const [interviewProgress, setInterviewProgress] = useState(() => {
    return searchParams.get("progress") || "not-started";
  });

  const [currentQuestion, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);
  const [followUpQuestions, setFollowUpQuestions] = useAtom(
    followUpQuestionsAtom,
  );
  const [mediaAccess, setMediaAccess] = useAtom(mediaAccessAtom);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeInterview = async () => {
      if (fetchedInterviewSession) {
        const { interviewSession: fetchedSession, calculatedCurrentQuestion } =
          fetchedInterviewSession;
        setInterviewSession(fetchedSession);
        setCurrentQuestion(calculatedCurrentQuestion ?? null);
        setResponses(fetchedSession.responses ?? []);
        setFollowUpQuestions(fetchedSession.FollowUpQuestions ?? []);

        // Update the progress based on the fetched session
        if (fetchedSession.status === InterviewSessionStatus.IN_PROGRESS) {
          updateProgress("in-progress");
        } else if (fetchedSession.status === InterviewSessionStatus.COMPLETED) {
          updateProgress("completed");
        }
      }

      // Check media access permissions
      try {
        const micPermission = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        const camPermission = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });

        setMediaAccess({
          microphone: micPermission.state === "granted",
          camera: camPermission.state === "granted",
        });
      } catch (error) {
        console.error("Error checking media permissions:", error);
        setMediaAccess({ microphone: false, camera: false });
      }

      setIsLoading(false);
    };

    initializeInterview().catch(() => {
      console.log("Error initializing interview");
    });
  }, [
    fetchedInterviewSession,
    interviewSessionId,
    setCurrentQuestion,
    setResponses,
    setInterviewSession,
    setFollowUpQuestions,
    setMediaAccess,
  ]);

  const updateProgress = (progress: string) => {
    setInterviewProgress(progress);
    const params = new URLSearchParams(searchParams.toString());
    params.set("progress", progress);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Interview Phases
  const hasCurrentQuestion = currentQuestion !== null;

  const renderInterviewContent = () => {
    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (interviewProgress === "in-progress") {
      return hasCurrentQuestion ? (
        <InterviewPerformContent
          organization={organization}
          study={study}
          interviewSessionRefetching={isLoading}
        />
      ) : null;
    }

    if (interviewProgress === "completed") {
      return (
        <InterviewFinishedContent
          organization={organization}
          study={study}
          onFinish={() => {
            // TODO: decide what comes here
          }}
        />
      );
    }

    // Use local state for initial stages
    return (
      <InterviewStartContent
        organization={organization}
        study={study}
        stage={localStage}
        setStage={setLocalStage}
        onStartInterview={() => updateProgress("in-progress")}
      />
    );
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
            calculatedCurrentQuestion={currentQuestion!}
          />
        </div>
        {renderInterviewContent()}
      </>
    </InterviewScreenLayout>
  );
};
