import React, { useEffect, useState } from "react";
import {
  Study,
  InterviewSession,
  Question,
  FollowUpQuestion,
  InterviewSessionStatus,
} from "@shared/generated/client";
import { CurrentQuestionType } from "@shared/types";

interface InterviewProgressBarProps {
  study: Study & { questions: Question[] };
  interviewSession: InterviewSession & {
    FollowUpQuestions: FollowUpQuestion[];
  };
  calculatedCurrentQuestion: CurrentQuestionType | null;
}

export function InterviewProgressBar({
  study,
  interviewSession,
  calculatedCurrentQuestion,
}: InterviewProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = () => {
      if (!calculatedCurrentQuestion) return 0;

      const totalBaseQuestions = study.questions.length;
      const assumedFollowUpsPerQuestion = 3;
      const totalSteps = totalBaseQuestions * (1 + assumedFollowUpsPerQuestion);

      let completedSteps = 0;

      const currentBaseQuestionIndex =
        "parentQuestionId" in calculatedCurrentQuestion
          ? study.questions.findIndex(
              (q) => q.id === calculatedCurrentQuestion.parentQuestionId,
            )
          : study.questions.findIndex(
              (q) => q.id === calculatedCurrentQuestion.id,
            );

      if (currentBaseQuestionIndex !== -1) {
        // Count completed base questions
        completedSteps =
          currentBaseQuestionIndex * (1 + assumedFollowUpsPerQuestion);

        if ("parentQuestionId" in calculatedCurrentQuestion) {
          // It's a follow-up question
          const followUpsForCurrentBase =
            interviewSession.FollowUpQuestions.filter(
              (fq) =>
                fq.parentQuestionId ===
                calculatedCurrentQuestion.parentQuestionId,
            );
          const currentFollowUpIndex = followUpsForCurrentBase.findIndex(
            (fq) => fq.id === calculatedCurrentQuestion.id,
          );

          // Calculate progress for follow-ups
          const baseQuestionProgress = 1 / (1 + assumedFollowUpsPerQuestion);
          const followUpProgress =
            (1 - baseQuestionProgress) / (assumedFollowUpsPerQuestion + 1);

          completedSteps += 1; // Count the base question
          completedSteps += (currentFollowUpIndex + 1) * followUpProgress;
        } else {
          // It's a base question
          completedSteps += 1; // Count the base question itself
        }
      }

      const calculatedProgress = (completedSteps / totalSteps) * 100;
      return Math.min(Math.max(calculatedProgress, 0), 99.9); // Ensure progress is between 0 and 99.9
    };

    const newProgress = calculateProgress();
    setProgress(newProgress);
  }, [
    study.questions,
    calculatedCurrentQuestion,
    interviewSession.FollowUpQuestions,
  ]);

  const getProgressWidth = () => {
    switch (interviewSession.status) {
      case InterviewSessionStatus.NOT_STARTED:
        return "0%";
      case InterviewSessionStatus.IN_PROGRESS:
        return `${progress}%`;
      case InterviewSessionStatus.COMPLETED:
        return "100%";
      default:
        return "0%";
    }
  };

  console.log("Progress width:", getProgressWidth());

  return (
    <div className="flex w-full items-center justify-between gap-6">
      <div className="relative h-2 w-full rounded-[1px] bg-theme-100 md:rounded-[2px]">
        <div
          className="absolute h-full rounded-[1px] bg-theme-600 transition-all duration-500 ease-in-out md:rounded-[2px]"
          style={{ width: getProgressWidth() }}
        ></div>
      </div>
    </div>
  );
}
