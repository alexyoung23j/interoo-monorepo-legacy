import React from "react";
import type {
  Question,
  InterviewSession,
  VideoStimulusType,
  Organization,
} from "@shared/generated/client";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { ImageStimuli } from "./stimuli/ImageStimuli";
import { VideoStimuli } from "./stimuli/VideoStimuli";
import { WebsiteStimuli } from "./stimuli/WebsiteStimuli";
import { isColorLight } from "@/app/utils/color";
import { MultipleChoiceSelect } from "./selections/MultipleChoiceSelect";
import { RangeChoiceSelect } from "./selections/RangeChoiceSelect";

interface DisplayQuestionProps {
  question: Question & {
    imageStimuli?: {
      bucketUrl: string;
      altText?: string | null;
      title?: string | null;
    }[];
    videoStimuli?: {
      url: string;
      title?: string | null;
      type: VideoStimulusType;
    }[];
    websiteStimuli?: { websiteUrl: string; title?: string | null }[];
    multipleChoiceOptions?: {
      id: string;
      optionText: string;
      optionOrder: number;
    }[];
  };
  interviewSession: InterviewSession;
  organization: Organization;
  multipleChoiceOptionSelectionId: string | null;
  setMultipleChoiceOptionSelectionId: (id: string | null) => void;
  rangeSelectionValue: number | null;
  setRangeSelectionValue: (value: number | null) => void;
}

export const DisplayQuestion: React.FC<DisplayQuestionProps> = ({
  question,
  interviewSession,
  organization,
  multipleChoiceOptionSelectionId,
  setMultipleChoiceOptionSelectionId,
  rangeSelectionValue,
  setRangeSelectionValue,
}) => {
  const isBackgroundLight = isColorLight(organization.secondaryColor ?? "");

  console.log({ question });

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4 md:w-[80%] md:py-0">
      <div className="text-center text-lg md:text-2xl">{question.title}</div>
      <ImageStimuli imageStimuli={question.imageStimuli} />
      <VideoStimuli videoStimuli={question.videoStimuli} />
      <WebsiteStimuli
        websiteStimuli={question.websiteStimuli}
        isBackgroundLight={isBackgroundLight}
      />
      {question.questionType === "MULTIPLE_CHOICE" && (
        <MultipleChoiceSelect
          question={question}
          interviewSession={interviewSession}
          organization={organization}
          isBackgroundLight={isBackgroundLight}
          multipleChoiceOptionSelectionId={multipleChoiceOptionSelectionId}
          setMultipleChoiceOptionSelectionId={
            setMultipleChoiceOptionSelectionId
          }
        />
      )}
      {question.questionType === "RANGE" && (
        <RangeChoiceSelect
          question={question}
          interviewSession={interviewSession}
          organization={organization}
          isBackgroundLight={isBackgroundLight}
          lowLabel={"least"}
          highLabel={"most"}
        />
      )}
    </div>
  );
};
