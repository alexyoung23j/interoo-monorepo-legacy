import React from "react";
import type { Question, InterviewSession } from "@shared/generated/client";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { ImageStimuli } from "./stimuli/ImageStimuli";

interface DisplayQuestionProps {
  question: Question & {
    imageStimuli?: {
      bucketUrl: string;
      altText?: string | null;
      title?: string | null;
    }[];
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

export const DisplayQuestion: React.FC<DisplayQuestionProps> = ({
  question,
  interviewSession,
}) => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4 md:w-[80%] md:py-0">
      <div className="text-center text-2xl">{question.title}</div>
      <ImageStimuli imageStimuli={question.imageStimuli} />
    </div>
  );
};
