"use client";

import React, { useState } from "react";
import {
  Question,
  Study,
  Response,
  InterviewSession,
} from "@shared/generated/client";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import SplitScreenLayout from "@/app/_components/layouts/org/SplitScreenLayout";
import BasicCard from "@/app/_components/reusable/BasicCard";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import ResultsQuestionCard from "./ResultsQuestionCard";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { ArrowSquareOut, X } from "@phosphor-icons/react";
import ResponsesPreview from "./ResponsesPreviewComponent";
import QuestionModal from "./QuestionModal";

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
  const [selectedInterviewSessionId, setSelectedInterviewSessionId] = useState<
    string | null
  >(null);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);

  const handleViewResponses = (question: Question) => {
    if (selectedQuestion?.id === question.id) {
      setSelectedQuestion(null);
    } else {
      setSelectedQuestion(question);
    }
  };

  return (
    <>
      <QuestionModal
        isOpen={
          questionModalOpen &&
          selectedInterviewSessionId !== null &&
          selectedQuestion !== null
        }
        onClose={() => setQuestionModalOpen(false)}
        question={selectedQuestion as Question}
        interviewSessionId={selectedInterviewSessionId ?? ""}
      />
      <SplitScreenLayout
        mainContent={
          <div className="flex flex-col gap-4">
            <div className="flex w-full flex-row items-center justify-between">
              <div className="text-lg font-medium text-theme-900">
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
            <div className="mt-8 text-lg font-medium text-theme-900">
              Interview Results
            </div>
            {study.questions
              ?.sort((a, b) => a.questionOrder - b.questionOrder)
              .map((question, index) => (
                <ResultsQuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  onViewResponses={() => {
                    handleViewResponses(question);
                  }}
                  isSelected={selectedQuestion?.id === question.id}
                />
              ))}
          </div>
        }
        showRightContent={selectedQuestion !== null}
        rightContent={
          <div className="flex w-full flex-col gap-4 text-theme-900">
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
            <div className="h-[1px] w-full bg-theme-200" />
            <ResponsesPreview
              question={selectedQuestion}
              onResponseClick={(response) => {
                setQuestionModalOpen(true);
                setSelectedInterviewSessionId(
                  response?.interviewSessionId ?? null,
                );
              }}
            />
          </div>
        }
      />
    </>
  );
};

export default ResultsPageComponent;
