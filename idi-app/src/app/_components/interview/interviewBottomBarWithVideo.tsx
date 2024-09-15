import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRight,
  Microphone,
  SpeakerSimpleHigh,
  SpeakerSimpleSlash,
  SpeakerX,
} from "@phosphor-icons/react";
import { SyncLoader, ClipLoader } from "react-spinners";
import { api } from "@/trpc/react";
import { cx } from "@/tailwind/styling";
import { isColorLight } from "@/app/utils/color";
import { useChunkedMediaUploader } from "@/hooks/useChunkedMediaUploader";
import {
  type FollowUpQuestion,
  Organization,
  Question,
  Study,
  QuestionType,
} from "@shared/generated/client";
import { showErrorToast } from "@/app/utils/toastUtils";
import {
  currentQuestionAtom,
  currentResponseAndUploadUrlAtom,
  followUpQuestionsAtom,
  interviewSessionAtom,
  responsesAtom,
} from "@/app/state/atoms";
import { useAtom } from "jotai";
import { calculateTranscribeAndGenerateNextQuestionRequest } from "@/app/utils/functions";
import WebcamPreview from "./WebcamPreview";
import { useTranscriptionRecorder } from "@/hooks/useTranscriptionRecorder";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InterviewBottomBarProps {
  organization: Organization;
  study: Study & {
    questions: Question[];
    boostedKeywords: {
      id: string;
      keyword: string;
      definition: string | null;
      studyId: string;
    }[];
  };
  multipleChoiceOptionSelectionId: string | null;
  rangeSelectionValue: number | null;
  handleSubmitMultipleChoiceResponse: () => void;
  awaitingOptionResponse: boolean;
  interviewSessionRefetching: boolean;
  handleSubmitRangeResponse: () => void;
  playTtsAudio: (text: string) => Promise<void>;
  stopTtsAudio: () => void;
}

const InterviewBottomBarWithVideo: React.FC<InterviewBottomBarProps> = ({
  organization,
  study,
  multipleChoiceOptionSelectionId,
  rangeSelectionValue,
  handleSubmitMultipleChoiceResponse,
  awaitingOptionResponse,
  interviewSessionRefetching,
  handleSubmitRangeResponse,
  playTtsAudio,
  stopTtsAudio,
}) => {
  const [currentQuestion] = useAtom(currentQuestionAtom);
  const [currentResponseAndUploadUrl, setCurrentResponseAndUploadUrl] = useAtom(
    currentResponseAndUploadUrlAtom,
  );
  const [interviewSession] = useAtom(interviewSessionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [followUpQuestions] = useAtom(followUpQuestionsAtom);
  const [audioOn, setAudioOn] = useState(true);
  const [isFullyRecording, setIsFullyRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const transcriptionRecorder = useTranscriptionRecorder({
    baseQuestions: study.questions,
  });

  const {
    startRecording: startChunkedMediaUploader,
    stopRecording: stopChunkedMediaUploader,
    isRecording,
    uploadProgress,
    error: uploadError,
    isUploadComplete,
    isUploadingFinalChunks,
  } = useChunkedMediaUploader();

  const isButtonDisabled = useMemo(() => {
    const disabled =
      !currentResponseAndUploadUrl.uploadSessionUrl ||
      (!isFullyRecording && !isUploadComplete) ||
      isUploadingFinalChunks ||
      isThinking;
    return disabled;
  }, [
    currentResponseAndUploadUrl.uploadSessionUrl,
    isFullyRecording,
    isUploadComplete,
    isUploadingFinalChunks,
    isThinking,
  ]);

  const startResponse = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("getUserMedia is not supported in this browser");
      return;
    }

    console.log("Starting response...");
    console.log(
      "Current upload URL:",
      currentResponseAndUploadUrl.uploadSessionUrl,
    );

    try {
      stopTtsAudio();
      setIsFullyRecording(true);
      await startChunkedMediaUploader(study.videoEnabled ?? false);
      await transcriptionRecorder.startRecording();
    } catch (err) {
      console.error("Error starting response:", err);
      showErrorToast("Error starting response. Please try again.");
      setIsFullyRecording(false);
    }
  };

  const stopResponse = async () => {
    setIsFullyRecording(false);
    setIsThinking(true);

    // Start the stopping process without waiting for it to complete
    stopChunkedMediaUploader().catch((error) => {
      console.error("Error stopping chunked media uploader:", error);
    });

    transcriptionRecorder.stopRecording();

    const requestBody = calculateTranscribeAndGenerateNextQuestionRequest({
      currentQuestion,
      interviewSession,
      study,
      responses,
      followUpQuestions,
      currentResponseId: currentResponseAndUploadUrl.response?.id ?? "",
    });

    try {
      const res = await transcriptionRecorder.submitAudio(requestBody);
      setIsThinking(false);
      if (res?.textToPlay && audioOn) {
        void playTtsAudio(res.textToPlay); // Use void to indicate we're not awaiting this
      }
    } catch (err) {
      console.error("Error submitting audio:", err);
      showErrorToast("Error uploading your answer. Please try again.");
      setIsThinking(false);
    }
  };

  const getOpenEndedButtonText = () => {
    if (isThinking) return "Thinking...";
    return isFullyRecording ? "Click to finish" : "Click to speak";
  };

  const getMultipleChoiceButtonText = () => {
    if (!awaitingOptionResponse && multipleChoiceOptionSelectionId) {
      return "Click to submit";
    }
    return "Select option";
  };

  const getRangeButtonText = () => {
    if (!awaitingOptionResponse && rangeSelectionValue !== null) {
      return "Click to submit";
    }
    return "Select value";
  };

  const renderOpenEndedButton = ({ showButtonText = true }) => (
    <div className="flex flex-col-reverse items-center gap-3 py-1 md:flex-col">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="unstyled"
              className={cx(
                "h-16 w-16 rounded-full border border-black border-opacity-25 md:mt-5",
                "transition-all duration-500 ease-in-out",
                "active:scale-85 active:bg-theme-200",
                isFullyRecording || isThinking
                  ? "bg-org-secondary opacity-50 hover:opacity-90"
                  : "bg-org-secondary hover:opacity-80",
                isButtonDisabled && "cursor-not-allowed opacity-50",
              )}
              onClick={isFullyRecording ? stopResponse : startResponse}
              disabled={isButtonDisabled}
            >
              {isFullyRecording ? (
                <SyncLoader
                  size={4}
                  color={
                    isColorLight(organization.secondaryColor ?? "")
                      ? "black"
                      : "white"
                  }
                  speedMultiplier={0.5}
                  margin={3}
                />
              ) : isThinking ? (
                <ClipLoader
                  size={16}
                  color={
                    isColorLight(organization.secondaryColor ?? "")
                      ? "black"
                      : "white"
                  }
                />
              ) : (
                <Microphone
                  color={
                    isColorLight(organization.secondaryColor ?? "")
                      ? "black"
                      : "white"
                  }
                  size={24}
                />
              )}
            </Button>
          </TooltipTrigger>
          {isUploadingFinalChunks && (
            <TooltipContent>
              Please wait until last upload completes!
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      {showButtonText && (
        <div className="text-sm leading-4 text-theme-900">
          {getOpenEndedButtonText()}
        </div>
      )}
    </div>
  );

  const renderMultipleChoiceButton = ({ showButtonText = true }) => (
    <div className="flex flex-col-reverse items-center gap-3 py-1 md:flex-col">
      <Button
        variant="unstyled"
        className={cx(
          "h-16 w-16 rounded-full border border-black border-opacity-25 md:mt-5",
          multipleChoiceOptionSelectionId
            ? "bg-org-secondary hover:opacity-80"
            : "bg-neutral-100 hover:bg-neutral-300",
        )}
        onClick={handleSubmitMultipleChoiceResponse}
      >
        {awaitingOptionResponse ? (
          <ClipLoader size={16} color="#525252" />
        ) : (
          <ArrowRight
            className="size-8"
            color={
              !multipleChoiceOptionSelectionId
                ? "grey"
                : isColorLight(organization.secondaryColor ?? "")
                  ? "black"
                  : "white"
            }
          />
        )}
      </Button>
      {showButtonText && (
        <div className="text-sm leading-4 text-neutral-500">
          {getMultipleChoiceButtonText()}
        </div>
      )}
    </div>
  );

  const renderRangeButton = ({ showButtonText = true }) => (
    <div className="flex flex-col-reverse items-center gap-3 py-1 md:flex-col">
      <Button
        variant="unstyled"
        className={cx(
          "h-16 w-16 rounded-full border border-black border-opacity-25 md:mt-5",
          rangeSelectionValue !== null
            ? "bg-org-secondary hover:opacity-80"
            : "bg-neutral-100 hover:bg-neutral-300",
        )}
        onClick={handleSubmitRangeResponse}
      >
        {awaitingOptionResponse ? (
          <ClipLoader size={16} color="#525252" />
        ) : (
          <ArrowRight
            className="size-8"
            color={
              rangeSelectionValue === null
                ? "grey"
                : isColorLight(organization.secondaryColor ?? "")
                  ? "black"
                  : "white"
            }
          />
        )}
      </Button>
      {showButtonText && (
        <div className="text-sm leading-4 text-neutral-500">
          {getRangeButtonText()}
        </div>
      )}
    </div>
  );

  const renderQuestionTypeButton = ({ showButtonText = true }) => {
    switch (currentQuestion?.questionType) {
      case QuestionType.OPEN_ENDED:
        return renderOpenEndedButton({ showButtonText: showButtonText });
      case QuestionType.MULTIPLE_CHOICE:
        return renderMultipleChoiceButton({ showButtonText: showButtonText });
      case QuestionType.RANGE:
        return renderRangeButton({ showButtonText: showButtonText });
      default:
        return <div>Unsupported question type</div>;
    }
  };

  const renderButtonTexts = () => {
    switch (currentQuestion?.questionType) {
      case QuestionType.OPEN_ENDED:
        return getOpenEndedButtonText();
      case QuestionType.MULTIPLE_CHOICE:
        return getMultipleChoiceButtonText();
      case QuestionType.RANGE:
        return getRangeButtonText();
    }
  };

  const showWebcamPreview = study.videoEnabled;

  return (
    <div className="flex w-full flex-col items-center justify-between bg-theme-off-white p-4 md:flex-row md:px-2 md:py-0">
      {/* Mobile layout */}
      <div className="relative flex w-full flex-row items-end md:hidden">
        <div className="mb-6 flex w-1/3 items-center justify-center">
          <div className="text-left text-sm text-theme-600">
            {renderButtonTexts()}
          </div>
        </div>

        <div className="flex w-1/3 items-center justify-center space-x-9">
          <div className="flex flex-col items-center gap-2">
            {renderQuestionTypeButton({ showButtonText: false })}
          </div>
        </div>
        <div className="flex w-1/3 items-center justify-end">
          {showWebcamPreview && (
            <div className="">
              <WebcamPreview />
            </div>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden w-full md:flex md:flex-row md:items-center md:justify-between md:px-2">
        <div className="flex gap-2 md:w-1/3">
          <Switch
            className="data-[state=checked]:bg-org-secondary"
            checked={audioOn}
            onCheckedChange={(checked) => {
              if (!checked) {
                stopTtsAudio();
              }
              setAudioOn(checked);
            }}
          />
          <div className="text-sm text-theme-600">
            {audioOn ? "Sound On" : "Sound Off"}
          </div>
        </div>

        <div className="flex items-stretch justify-center md:w-1/3">
          {renderQuestionTypeButton({ showButtonText: true })}
        </div>

        <div className="flex items-center justify-end md:w-1/3">
          {showWebcamPreview && <WebcamPreview />}
        </div>
      </div>
    </div>
  );
};

export default InterviewBottomBarWithVideo;
