"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  interviewProgressAtom,
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

  const [interviewProgress, setInterviewProgress] = useAtom(
    interviewProgressAtom,
  );

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

        // Batch state updates
        setInterviewSession((prev) => ({
          ...prev,
          ...fetchedSession,
          responses: fetchedSession.responses ?? [],
          FollowUpQuestions: fetchedSession.FollowUpQuestions ?? [],
        }));
        setCurrentQuestion(calculatedCurrentQuestion ?? null);

        console.log("Fetched interview session status:", fetchedSession.status);

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

        navigator.mediaDevices.getUserMedia({ audio: true });
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

  const updateProgress = useCallback(
    (progress: string) => {
      setInterviewProgress(progress);
    },
    [setInterviewProgress],
  );

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
      <div className="flex h-full w-full flex-col">
        <div className="w-full md:p-4">
          <InterviewProgressBar
            interviewSession={
              interviewSession as InterviewSession & {
                FollowUpQuestions: FollowUpQuestion[];
              }
            }
            study={study}
            calculatedCurrentQuestion={currentQuestion}
          />
        </div>
        <div className="h-full flex-1 overflow-hidden">
          {renderInterviewContent()}
        </div>
      </div>
    </InterviewScreenLayout>
  );
};
