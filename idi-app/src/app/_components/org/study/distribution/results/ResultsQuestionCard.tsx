import React from "react";
import { Question } from "@shared/generated/client";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { Button } from "@/components/ui/button";
import { CaretRight, ChatCircle, Clock } from "@phosphor-icons/react";

interface ResultsQuestionCardProps {
  question: Question & { _count?: { Response: number } };
}

const ResultsQuestionCard: React.FC<ResultsQuestionCardProps> = ({
  question,
}) => {
  return (
    <BasicCard className="flex flex-col">
      <div className="flex flex-row items-start justify-between">
        <h3 className="text-theme-900 text-lg font-medium">{question.title}</h3>
        <Button variant="secondary" className="flex flex-row items-center">
          <span>See Responses</span>
          <CaretRight className="ml-2" size={16} />
        </Button>
      </div>
      <div className="mt-4 flex flex-row items-center gap-4">
        <div className="flex flex-row items-center gap-2">
          <ChatCircle className="text-theme-500" size={20} />
          <span className="text-theme-900">
            {question._count?.Response ?? 0} Responses
          </span>
        </div>
        <div className="flex flex-row items-center gap-2">
          <Clock className="text-theme-500" size={20} />
          <span className="text-theme-900">1:24 Average completion time</span>
        </div>
      </div>
    </BasicCard>
  );
};

export default ResultsQuestionCard;
