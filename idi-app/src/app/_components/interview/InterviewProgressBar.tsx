import React, { useEffect, useState } from "react";
import {
  Study,
  InterviewSession,
  Question,
  FollowUpQuestion,
  InterviewSessionStatus,
} from "@shared/generated/client";
import { CurrentQuestionType } from "@shared/types";
import { followUpQuestionsAtom } from "@/app/state/atoms";
import { useAtom } from "jotai";

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
  const [followUpQuestions] = useAtom(followUpQuestionsAtom);

  useEffect(() => {
    const calculateProgress = () => {
      if (!calculatedCurrentQuestion) return 0;

      const totalBaseQuestions = study.questions.length;
      const baseQuestionWeight = 0.8; // 80% of progress from base questions
      const followUpWeight = 1 - baseQuestionWeight;

      const currentBaseQuestionIndex =
        "parentQuestionId" in calculatedCurrentQuestion
          ? study.questions.findIndex(
              (q) => q.id === calculatedCurrentQuestion.parentQuestionId,
            )
          : study.questions.findIndex(
              (q) => q.id === calculatedCurrentQuestion.id,
            );

      if (currentBaseQuestionIndex === -1) return 0;

      const baseProgress =
        ((currentBaseQuestionIndex + 1) / totalBaseQuestions) *
        baseQuestionWeight;
      let followUpProgress = 0;

      if ("parentQuestionId" in calculatedCurrentQuestion) {
        const followUpsForCurrentBase = followUpQuestions.filter(
          (fq) =>
            fq.parentQuestionId === calculatedCurrentQuestion.parentQuestionId,
        );
        const currentFollowUpIndex = followUpsForCurrentBase.findIndex(
          (fq) => fq.id === calculatedCurrentQuestion.id,
        );

        followUpProgress =
          ((currentFollowUpIndex + 1) / (followUpsForCurrentBase.length + 1)) *
          (followUpWeight / totalBaseQuestions);
      }

      const totalProgress = (baseProgress + followUpProgress) * 100;
      return Math.min(Math.max(totalProgress, 0), 99.9);
    };

    setProgress(calculateProgress());
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

  return (
    <div className="flex w-full items-center justify-between gap-6 md:mb-12">
      <div className="relative h-2 w-full rounded-[1px] bg-theme-100 md:rounded-[2px]">
        <div
          className="absolute h-full rounded-[1px] bg-org-secondary transition-all duration-500 ease-in-out md:rounded-[2px]"
          style={{ width: getProgressWidth() }}
        ></div>
      </div>
    </div>
  );
}
