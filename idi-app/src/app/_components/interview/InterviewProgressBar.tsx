import React from "react";
import { Study, InterviewSession, Question } from "@shared/generated/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";

interface InterviewProgressBarProps {
  study: Study;
  interviewSession: InterviewSession;
  onBack: () => void;
  onNext: () => void;
}

export function InterviewProgressBar({
  study,
  interviewSession,
  onBack,
  onNext,
}: InterviewProgressBarProps) {
  const progress = 15;
  return (
    <div className="flex w-full items-center justify-between gap-6">
      <Button
        onClick={onBack}
        variant="icon"
        className="hidden border border-black md:flex"
        size="icon"
      >
        <ArrowLeft className="size-4 text-[#7A7A7A]" weight="bold" />
      </Button>

      <div className="relative h-2 w-full rounded-[1px] bg-[#EAE8E8] md:rounded-[2px]">
        <div
          className="bg-org-secondary absolute h-full rounded-[1px] md:rounded-[2px]"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <Button
        onClick={onBack}
        variant="icon"
        className="hidden border border-black md:flex"
        size="icon"
      >
        <ArrowRight className="size-4 text-[#7A7A7A]" weight="bold" />
      </Button>
    </div>
  );
}
