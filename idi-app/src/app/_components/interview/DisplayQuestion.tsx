import React, { useMemo } from "react";
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
  ttsAudioDuration: number | null;
}

export const DisplayQuestion: React.FC<DisplayQuestionProps> = ({
  organization,
  multipleChoiceOptionSelectionId,
  setMultipleChoiceOptionSelectionId,
  rangeSelectionValue,
  setRangeSelectionValue,
  ttsAudioDuration,
}) => {
  const isBackgroundLight = isColorLight(organization.secondaryColor ?? "");
  const [currentQuestion] = useAtom(currentQuestionAtom);

  const words = useMemo(
    () => currentQuestion?.title?.split(" ") || [],
    [currentQuestion?.title],
  );

  // Calculate delay for each word based on ttsAudioDuration
  const getDelay = (index: number) => {
    if (ttsAudioDuration === null) return "0ms";
    const totalWords = words.length;
    return `${(index / totalWords) * ttsAudioDuration}ms`;
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4 md:w-[70%] md:py-0">
      <div className="text-center text-lg md:text-2xl">
        {ttsAudioDuration === null ? (
          <span className="animate-fade-in">{currentQuestion?.title}</span>
        ) : (
          words.map((word, index) => (
            <span
              key={index}
              className="animate-fade-in inline-block opacity-0"
              style={{
                animationDelay: getDelay(index),
                animationFillMode: "forwards",
              }}
            >
              {word}{" "}
            </span>
          ))
        )}
      </div>
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
      <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:items-center md:justify-center">
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
      </div>
    </div>
  );
};
