import React from "react";
import { FollowUpLevel, Question } from "@shared/generated/client";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { Button } from "@/components/ui/button";
import {
  CaretRight,
  ChatCircle,
  Clock,
  ListChecks,
  Sparkle,
  Waveform,
} from "@phosphor-icons/react";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";

interface ResultsQuestionCardProps {
  question: Question & { _count?: { Response: number } };
  index: number;
}

const getFollowUpLevelAverage = (level: FollowUpLevel): number => {
  switch (level) {
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

const ResultsQuestionCard: React.FC<ResultsQuestionCardProps> = ({
  question,
  index,
}) => {
  return (
    <BasicCard className="shadow-standard flex flex-col gap-4 p-6">
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-theme-900 text-lg font-semibold">
          {`Question ${index + 1}: `}
          {question.title}
        </h3>
        <Button
          variant="secondary"
          className="flex flex-row items-center"
          size="sm"
        >
          <span>See Responses</span>
          <CaretRight className="ml-2" size={16} />
        </Button>
      </div>
      <div className="bg-theme-200 h-[1px] w-full" />
      <div>
        <div className="flex flex-col gap-2">
          <div className="text-theme-900 flex flex-row items-center gap-2 text-base font-medium">
            Summary{" "}
            <Sparkle size={16} className="text-theme-900" weight="bold" />
          </div>
          <div className="text-theme-600 mb-4 text-sm">
            AI summaries coming soon!
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-theme-900 flex flex-row items-center gap-2 text-base font-medium">
            Codes{" "}
            <ListChecks size={16} className="text-theme-900" weight="bold" />
          </div>
          <div className="text-theme-600 mb-4 text-sm">
            AI powered coding and analysis coming soon!
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-theme-900 flex flex-row items-center gap-2 text-base font-medium">
            Responses{" "}
            <Waveform size={16} className="text-theme-900" weight="bold" />
          </div>
          <div className="text-theme-600 mb-4 text-sm">
            <div className="flex w-full flex-row items-center gap-6">
              <span className="text-theme-900 font-semibold">
                {question._count?.Response ?? 0}{" "}
                <span className="text-theme-500 font-normal">Responses</span>
              </span>
              <span className="text-theme-900 font-semibold">
                TODO{" "}
                <span className="text-theme-500 font-normal">
                  Avg. Completion Time
                </span>
              </span>
              <span className="text-theme-900 font-semibold">
                {getFollowUpLevelAverage(question.followUpLevel)}{" "}
                <span className="text-theme-500 font-normal">
                  Avg. Follow Ups
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </BasicCard>
  );
};

export default ResultsQuestionCard;
