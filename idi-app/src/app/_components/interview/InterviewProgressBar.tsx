import React, { useCallback, useState, useEffect } from "react";
import {
  Study,
  InterviewSession,
  Question,
  FollowUpQuestion,
  InterviewSessionStatus,
  FollowUpLevel,
} from "@shared/generated/client";
import { CurrentQuestionType } from "@shared/types";

interface InterviewProgressBarProps {
  study: Study & { questions: Question[] };
  interviewSession: InterviewSession & {
    FollowUpQuestions: FollowUpQuestion[];
  };
  calculatedCurrentQuestion: CurrentQuestionType;
}

export function InterviewProgressBar({
  study,
  interviewSession,
  calculatedCurrentQuestion,
}: InterviewProgressBarProps) {
  const estimateFollowUpsForQuestion = (question: Question): number => {
    switch (question.followUpLevel) {
      case FollowUpLevel.AUTOMATIC:
        return 3;
      case FollowUpLevel.SURFACE:
        return 2;
      case FollowUpLevel.LIGHT:
        return 3;
      case FollowUpLevel.DEEP:
        return 5;
      default:
        return 3;
    }
  };

  const calculateProgress = useCallback(() => {
    const totalBaseQuestions = study.questions.length;
    const completedFollowUps = interviewSession.FollowUpQuestions.length;

    let currentBaseQuestionIndex = 0;
    let completedQuestionsCount = 0;

    if ("parentQuestionId" in calculatedCurrentQuestion) {
      // It's a follow-up question
      const parentQuestion = study.questions.find(
        (q) => q.id === calculatedCurrentQuestion.parentQuestionId,
      );
      if (parentQuestion) {
        currentBaseQuestionIndex = parentQuestion.questionOrder;
        completedQuestionsCount = currentBaseQuestionIndex + 1; // Include the current base question

        // Add completed follow-ups for the current base question
        const currentFollowUps = interviewSession.FollowUpQuestions.filter(
          (fq) => fq.parentQuestionId === parentQuestion.id,
        );
        const currentFollowUpIndex = currentFollowUps.findIndex(
          (fq) => fq.id === calculatedCurrentQuestion.id,
        );
        completedQuestionsCount += currentFollowUpIndex + 1; // Include the current follow-up
      }
    } else {
      // It's a base question
      const currentQuestion = study.questions.find(
        (q) => q.id === calculatedCurrentQuestion.id,
      );
      if (currentQuestion) {
        currentBaseQuestionIndex = currentQuestion.questionOrder;
        completedQuestionsCount = currentBaseQuestionIndex; // Don't include the current question yet
      }
    }

    // Estimate total questions including follow-ups
    const estimatedRemainingFollowUps = study.questions
      .slice(currentBaseQuestionIndex)
      .reduce(
        (sum, question) => sum + estimateFollowUpsForQuestion(question),
        0,
      );

    const totalEstimatedQuestions =
      totalBaseQuestions + completedFollowUps + estimatedRemainingFollowUps;

    return Math.min(
      (completedQuestionsCount / totalEstimatedQuestions) * 100,
      100,
    );
  }, [
    study.questions,
    calculatedCurrentQuestion,
    interviewSession.FollowUpQuestions,
  ]);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(calculateProgress());
  }, [calculateProgress]);

  const getProgressWidth = () => {
    switch (interviewSession.status) {
      case InterviewSessionStatus.NOT_STARTED:
        return "5%";
      case InterviewSessionStatus.IN_PROGRESS:
        return `${progress}%`;
      case InterviewSessionStatus.COMPLETED:
        return "100%";
      default:
        return "0%";
    }
  };

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
