import React from "react";
import { Question, InterviewSession } from "@shared/generated/client";

interface DisplayQuestionMaterialsProps {
  question: Question & {
    imageStimuli?: { bucketUrl: string; altText?: string | null }[];
    videoStimuli?: { url: string; title?: string | null }[];
    websiteStimuli?: { websiteUrl: string; title?: string | null }[];
    multipleChoiceOptions?: {
      id: string;
      optionText: string;
      optionOrder: number;
    }[];
  };
  interviewSession: InterviewSession;
}

export const DisplayQuestionMaterials: React.FC<
  DisplayQuestionMaterialsProps
> = ({ question, interviewSession }) => {
  // TODO: Fill it out based on question content
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
      <div className="text-2xl">{question.title}</div>
    </div>
  );
};
