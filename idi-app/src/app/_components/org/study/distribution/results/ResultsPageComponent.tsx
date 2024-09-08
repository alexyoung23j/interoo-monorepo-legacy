"use client";

import React from "react";
import { Question, Study, Response } from "@shared/generated/client";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import SplitScreenLayout from "@/app/_components/layouts/org/SplitScreenLayout";
import BasicCard from "@/app/_components/reusable/BasicCard";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import ResultsQuestionCard from "./ResultsQuestionCard";

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
  console.log({ study });
  return (
    <SplitScreenLayout
      mainContent={
        <div className="flex flex-col gap-4">
          <div className="text-theme-900 text-lg font-medium">
            Study Statistics
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
          <div className="text-theme-900 text-lg font-medium">
            InterviewResults
          </div>
          {study.questions?.map((question) => (
            <ResultsQuestionCard key={question.id} question={question} />
          ))}
        </div>
      }
      showRightContent={false}
      rightContent={<BasicCard>hi</BasicCard>}
    />
  );
};

export default ResultsPageComponent;
