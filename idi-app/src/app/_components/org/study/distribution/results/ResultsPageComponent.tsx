"use client";

import React, { useState } from "react";
import { Question, Study, Response } from "@shared/generated/client";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import SplitScreenLayout from "@/app/_components/layouts/org/SplitScreenLayout";
import BasicCard from "@/app/_components/reusable/BasicCard";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import ResultsQuestionCard from "./ResultsQuestionCard";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { ArrowSquareOut, X } from "@phosphor-icons/react";
import ResponsesPreview from "./ResponsesPreviewComponent";

export type ExtendedStudy = Study & {
  completedInterviewsCount: number;
  inProgressInterviewsCount: number;
  questions: (Question & { _count?: { Response: number } })[];
};

interface ResultsPageComponentProps {
  study: ExtendedStudy;
}

const ResultsPageComponent: React.FC<ResultsPageComponentProps> = ({
  study,
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );

  const handleViewResponses = (question: Question) => {
    setSelectedQuestion(question);
  };
  return (
    <SplitScreenLayout
      mainContent={
        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-row items-center justify-between">
            <div className="text-theme-900 text-lg font-medium">
              Study Statistics
            </div>
            <Button
              variant="secondary"
              className="flex flex-row gap-2"
              onClick={() => {
                // TODO
              }}
            >
              <ArrowSquareOut size={16} className="text-theme-900" /> Export
              Data
            </Button>
          </div>
          <BasicHeaderCard
            items={[
              {
                title: study.completedInterviewsCount.toString(),
                subtitle: "Completed Interviews",
              },
              {
                title: study.inProgressInterviewsCount.toString(),
                subtitle: "Incomplete Interviews",
              },
              {
                title: "todo",
                subtitle: "Average Completion Time",
              },
            ]}
          />
          <div className="text-theme-900 mt-8 text-lg font-medium">
            Interview Results
          </div>
          {study.questions?.map((question, index) => (
            <ResultsQuestionCard
              key={question.id}
              question={question}
              index={index}
              onViewResponses={() => {
                console.log("viewing responses");
                handleViewResponses(question);
              }}
            />
          ))}
        </div>
      }
      showRightContent={selectedQuestion !== null}
      rightContent={
        <div className="text-theme-900 flex w-full flex-col gap-4">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="text-lg font-semibold">
              {selectedQuestion?.title}
            </div>
            <div
              className="cursor-pointer"
              onClick={() => setSelectedQuestion(null)}
            >
              <X size={24} className="text-theme-900" />
            </div>
          </div>
          <div className="bg-theme-200 h-[1px] w-full" />
          <ResponsesPreview question={selectedQuestion} />
        </div>
      }
    />
  );
};

export default ResultsPageComponent;
