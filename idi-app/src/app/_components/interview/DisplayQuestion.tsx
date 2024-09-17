import React, { useEffect, useState } from "react";
import type {
  Question,
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
import { currentQuestionAtom } from "@/app/state/atoms";
import { useAtom } from "jotai";
import { BaseQuestionExtended } from "@shared/types";

interface DisplayQuestionProps {
  organization: Organization;
  multipleChoiceOptionSelectionId: string | null;
  setMultipleChoiceOptionSelectionId: (id: string | null) => void;
  rangeSelectionValue: number | null;
  setRangeSelectionValue: (value: number | null) => void;
}

export const DisplayQuestion: React.FC<DisplayQuestionProps> = ({
  organization,
  multipleChoiceOptionSelectionId,
  setMultipleChoiceOptionSelectionId,
  rangeSelectionValue,
  setRangeSelectionValue,
}) => {
  const isBackgroundLight = isColorLight(organization.secondaryColor ?? "");
  const [currentQuestion] = useAtom(currentQuestionAtom);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4 pt-8 md:py-0">
      <div
        className={`animate-fade-in text-center md:px-20 ${
          currentQuestion?.title.length && currentQuestion?.title.length > 180
            ? "text-md md:text-lg"
            : "text-lg md:text-2xl"
        }`}
      >
        {currentQuestion?.title}
      </div>
      <div className="flex w-full overflow-y-auto scrollbar-thin">
        {currentQuestion?.questionType === "RANGE" && (
          <RangeChoiceSelect
            question={currentQuestion as BaseQuestionExtended}
            organization={organization}
            isBackgroundLight={isBackgroundLight}
            lowLabel={"least"}
            highLabel={"most"}
            rangeSelectionValue={rangeSelectionValue}
            setRangeSelectionValue={setRangeSelectionValue}
          />
        )}
        {currentQuestion?.questionType === "MULTIPLE_CHOICE" && (
          <MultipleChoiceSelect
            question={currentQuestion as BaseQuestionExtended}
            organization={organization}
            isBackgroundLight={isBackgroundLight}
            multipleChoiceOptionSelectionId={
              multipleChoiceOptionSelectionId ?? ""
            }
            setMultipleChoiceOptionSelectionId={
              setMultipleChoiceOptionSelectionId
            }
          />
        )}
        <ImageStimuli
          imageStimuli={(currentQuestion as BaseQuestionExtended)?.imageStimuli}
        />
        <VideoStimuli
          videoStimuli={(currentQuestion as BaseQuestionExtended)?.videoStimuli}
        />
        <WebsiteStimuli
          websiteStimuli={
            (currentQuestion as BaseQuestionExtended).websiteStimuli
          }
          isBackgroundLight={isBackgroundLight}
        />
      </div>
    </div>
  );
};
