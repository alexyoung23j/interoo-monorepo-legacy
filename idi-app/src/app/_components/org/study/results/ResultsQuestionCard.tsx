import React, { useState } from "react";
import {
  FollowUpLevel,
  Question,
  QuestionType,
} from "@shared/generated/client";
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
import { api } from "@/trpc/react";
import MultipleChoiceMetadataDisplay from "./MultipleChoiceMetadataDisplay";

interface ResultsQuestionCardProps {
  question: Question & { _count?: { Response: number } };
  index: number;
  onViewResponses: () => void;
  isSelected: boolean;
}

const getFollowUpLevelAverage = (level: FollowUpLevel): number => {
  switch (level) {
    case FollowUpLevel.AUTOMATIC:
      return 2;
    case FollowUpLevel.SURFACE:
      return 1;
    case FollowUpLevel.LIGHT:
      return 2;
    case FollowUpLevel.DEEP:
      return 4;
    default:
      return 3;
  }
};

const ResultsQuestionCard: React.FC<ResultsQuestionCardProps> = ({
  question,
  index,
  onViewResponses,
  isSelected,
}) => {
  const renderQuestionTypeMetadata = () => {
    switch (question.questionType) {
      case QuestionType.OPEN_ENDED:
        return (
          <div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2 text-base font-medium text-theme-900">
                Summary{" "}
                <Sparkle size={16} className="text-theme-900" weight="bold" />
              </div>
              <div className="mb-4 text-sm text-theme-600">
                AI summaries coming soon!
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2 text-base font-medium text-theme-900">
                Codes{" "}
                <ListChecks
                  size={16}
                  className="text-theme-900"
                  weight="bold"
                />
              </div>
              <div className="mb-4 text-sm text-theme-600">
                AI powered coding and analysis coming soon!
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2 text-base font-medium text-theme-900">
                Responses{" "}
                <Waveform size={16} className="text-theme-900" weight="bold" />
              </div>
              <div className="mb-4 text-sm text-theme-600">
                <div className="flex w-full flex-row items-center gap-6">
                  <span className="font-semibold text-theme-900">
                    {question._count?.Response ?? 0}{" "}
                    <span className="font-normal text-theme-500">
                      Responses
                    </span>
                  </span>

                  <span className="font-semibold text-theme-900">
                    {getFollowUpLevelAverage(question.followUpLevel)}{" "}
                    <span className="font-normal text-theme-500">
                      Avg. Follow Ups
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      case QuestionType.MULTIPLE_CHOICE:
        return <MultipleChoiceMetadataDisplay questionId={question.id} />;
      case QuestionType.RANGE:
        return <div>Coming Soon!</div>;
    }
  };
  return (
    <BasicCard
      className={`flex flex-col gap-4 p-6 shadow-standard ${
        isSelected ? "!bg-theme-50" : ""
      }`}
    >
      <div className="flex flex-row items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-theme-900">
          {`Question ${index + 1}: `}
          {question.title}
        </h3>
        <Button
          variant="secondary"
          className="flex flex-row items-center"
          size="sm"
          onClick={onViewResponses}
        >
          <span>See Responses</span>
          <CaretRight className="ml-2" size={16} />
        </Button>
      </div>
      <div className="h-[1px] w-full bg-theme-200" />
      {renderQuestionTypeMetadata()}
    </BasicCard>
  );
};

export default ResultsQuestionCard;
