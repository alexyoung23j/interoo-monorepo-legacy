import React from "react";
import {
  Study,
  InterviewSession,
  Question,
  FollowUpQuestion,
} from "@shared/generated/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { CurrentQuestionType } from "./InterviewLayout";

interface InterviewProgressBarProps {
  study: Study & { questions: Question[] };
  interviewSession: InterviewSession & {
    FollowUpQuestions: FollowUpQuestion[];
  };
  onBack: () => void;
  onNext: () => void;
  calculatedCurrentQuestion: CurrentQuestionType;
}

export function InterviewProgressBar({
  study,
  interviewSession,
  onBack,
  onNext,
  calculatedCurrentQuestion,
}: InterviewProgressBarProps) {
  const calculateProgress = () => {
    const totalMainQuestions = study.questions.length;

    const mainQuestionInterval = 100 / totalMainQuestions;

    if ("parentQuestionId" in calculatedCurrentQuestion) {
      // It's a follow-up question
      const parentQuestion = study.questions.find(
        (q) => q.id === calculatedCurrentQuestion.parentQuestionId,
      );
      if (!parentQuestion) {
        console.error("Parent question not found");
        return 0;
      }
      const baseProgress =
        (parentQuestion.questionOrder + 1) * mainQuestionInterval;
      const followUpProgress = mainQuestionInterval * 0.25; // 20% of the interval for follow-ups TODO: this should technically use the follow-up levels to decide the sub-interval here
      return Math.min(baseProgress + followUpProgress, 100);
    } else {
      // It's a main question
      const currentQuestion = study.questions.find(
        (q) => q.id === calculatedCurrentQuestion.id,
      );
      if (!currentQuestion) {
        console.error("Current question not found");
        return 0;
      }

      return Math.min(
        (currentQuestion.questionOrder + 1) * mainQuestionInterval,
        100,
      );
    }
  };

  const progress = calculatedCurrentQuestion ? calculateProgress() : 5;

  return (
    <div className="flex w-full items-center justify-between gap-6">
      {/* <Button
        onClick={onBack}
        variant="icon"
        className="hidden border border-black md:flex"
        size="icon"
      >
        <ArrowLeft className="size-4 text-[#7A7A7A]" weight="bold" />
      </Button> */}

      <div className="relative h-2 w-full rounded-[1px] bg-[#EAE8E8] md:rounded-[2px]">
        <div
          className="absolute h-full rounded-[1px] bg-org-secondary md:rounded-[2px]"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {/* <Button
        onClick={onBack}
        variant="icon"
        className="hidden border border-black md:flex"
        size="icon"
      >
        <ArrowRight className="size-4 text-[#7A7A7A]" weight="bold" />
      </Button> */}
    </div>
  );
}
