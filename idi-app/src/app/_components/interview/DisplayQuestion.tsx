import React from "react";
import type { Question, InterviewSession } from "@shared/generated/client";
import Image from "next/image";

interface DisplayQuestionProps {
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

export const DisplayQuestion: React.FC<DisplayQuestionProps> = ({
  question,
  interviewSession,
}) => {
  // TODO: Fill it out based on question content
  return (
    <div className="flex h-full w-[80%] flex-col items-center justify-center gap-4 p-4 md:w-full">
      <div className="text-center text-2xl">{question.title}</div>
      <div className="flex flex-col gap-4">
        {question.imageStimuli?.map((image, index) => (
          <div key={index} className="relative h-full min-h-[200px] w-full">
            <Image
              src={image.bucketUrl}
              alt={image.altText ?? `Image ${index + 1}`}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
};
