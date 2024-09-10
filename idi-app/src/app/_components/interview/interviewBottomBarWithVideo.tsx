import React, { useState, useEffect, useCallback } from "react";
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
import { useTtsAudio } from "@/hooks/useTtsAudio";

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
  const [awaitingNextQuestionGeneration, setAwaitingNextQuestionGeneration] =
    useState(false);
  const transcriptionRecorder = useTranscriptionRecorder({
    baseQuestions: study.questions,
  });

  const {
    startRecording: startChunkedMediaUploader,
    stopRecording: stopChunkedMediaUploader,
    isRecording,
    uploadProgress,
    error: uploadError,
  } = useChunkedMediaUploader();

  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "slow" | "verySlow" | "failed"
  >("idle");
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);

  const updateUploadStatus = useCallback(() => {
    if (uploadStartTime === null) return;

    const elapsedTime = Date.now() - uploadStartTime;
    if (elapsedTime > 5000 && uploadProgress < 90) {
      setUploadStatus("verySlow");
    } else if (elapsedTime > 30000 && uploadProgress < 50) {
      setUploadStatus("slow");
    }
  }, [uploadStartTime, uploadProgress]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (uploadStatus === "uploading" || uploadStatus === "slow") {
      intervalId = setInterval(updateUploadStatus, 5000);
    }
    return () => clearInterval(intervalId);
  }, [uploadStatus, updateUploadStatus]);

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
      await transcriptionRecorder.startRecording();

      if (transcriptionRecorder.noAnswerDetected) {
        return;
      }
      await startChunkedMediaUploader(study.videoEnabled ?? false);
      console.log("Chunked media uploader started");
      setIsFullyRecording(true);
      setUploadStatus("idle");
      setUploadStartTime(null);
    } catch (err) {
      console.error("Error starting response:", err);
      showErrorToast("Error starting response. Please try again.");
      setIsFullyRecording(false);
    }
  };

  const stopResponse = async () => {
    setIsFullyRecording(false);
    setAwaitingNextQuestionGeneration(true);
    setUploadStatus("uploading");
    setUploadStartTime(Date.now());

    try {
      await Promise.all([
        stopChunkedMediaUploader(),
        transcriptionRecorder.stopRecording(),
      ]);

      const requestBody = calculateTranscribeAndGenerateNextQuestionRequest({
        currentQuestion,
        interviewSession,
        study,
        responses,
        followUpQuestions,
        currentResponseId: currentResponseAndUploadUrl.response?.id ?? "",
      });

      const res = await transcriptionRecorder.submitAudio(requestBody);
      setAwaitingNextQuestionGeneration(false);
      setUploadStatus("idle");

      if (res?.textToPlay && audioOn) {
        await playTtsAudio(res.textToPlay);
      }
    } catch (err) {
      console.error("Error submitting audio:", err);
      setUploadStatus("failed");
      showErrorToast("Error uploading your answer. Please try again.");
      setAwaitingNextQuestionGeneration(false);
    }
  };

  const getButtonText = () => {
    switch (uploadStatus) {
      case "uploading":
        return `Thinking...`;
      case "slow":
        return "Hang on - almost there!";
      case "verySlow":
        return "Your network is a bit slow- your video may be getting dropped";
      case "failed":
        return "Upload failed. Click to retry.";
      default:
        return isFullyRecording ? "Click to finish" : "Click to speak";
    }
  };

  const renderOpenEndedButton = () => (
    <div className="flex flex-col-reverse items-center gap-3 py-1 md:flex-col">
      <Button
        variant="unstyled"
        className={cx(
          "h-14 w-14 rounded-sm border border-black border-opacity-25 md:mt-5",
          isFullyRecording || uploadStatus !== "idle"
            ? "bg-org-secondary hover:opacity-80"
            : "bg-neutral-100 hover:bg-neutral-300",
          !currentResponseAndUploadUrl.uploadSessionUrl &&
            "cursor-not-allowed opacity-50",
        )}
        onClick={
          uploadStatus === "failed"
            ? startResponse
            : isFullyRecording
              ? stopResponse
              : startResponse
        }
        disabled={
          uploadStatus === "uploading" ||
          uploadStatus === "slow" ||
          uploadStatus === "verySlow" ||
          !currentResponseAndUploadUrl.uploadSessionUrl
        }
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
        ) : uploadStatus !== "idle" ? (
          <ClipLoader
            size={16}
            color={
              isColorLight(organization.secondaryColor ?? "")
                ? "black"
                : "white"
            }
          />
        ) : (
          <Microphone className="size-8 text-neutral-600" />
        )}
      </Button>
      <div className="text-sm leading-4 text-neutral-500">
        {getButtonText()}
      </div>
    </div>
  );

  const renderMultipleChoiceButton = () => (
    <div className="flex flex-col-reverse items-center gap-3 py-1 md:flex-col">
      <Button
        variant="unstyled"
        className={cx(
          "h-14 w-14 rounded-sm border border-black border-opacity-25 md:mt-5",
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
      <div className="text-sm leading-4 text-neutral-500 md:mt-2">
        {!awaitingOptionResponse && multipleChoiceOptionSelectionId
          ? "Click to submit"
          : "Select an option"}
      </div>
    </div>
  );

  const renderRangeButton = () => (
    <div className="flex flex-col-reverse items-center gap-3 py-1 md:flex-col">
      <Button
        variant="unstyled"
        className={cx(
          "h-14 w-14 rounded-sm border border-black border-opacity-25 md:mt-5",
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
      <div className="text-sm leading-4 text-neutral-500 md:mt-2">
        {!awaitingOptionResponse && rangeSelectionValue !== null
          ? "Click to submit"
          : "Select a value"}
      </div>
    </div>
  );

  const renderQuestionTypeButton = () => {
    switch (currentQuestion?.questionType) {
      case QuestionType.OPEN_ENDED:
        return renderOpenEndedButton();
      case QuestionType.MULTIPLE_CHOICE:
        return renderMultipleChoiceButton();
      case QuestionType.RANGE:
        return renderRangeButton();
      default:
        return <div>Unsupported question type</div>;
    }
  };

  const isOpenEndedQuestion =
    currentQuestion?.questionType === QuestionType.OPEN_ENDED;

  const showWebcamPreview = study.videoEnabled;

  return (
    <div className="bg-theme-off-white flex w-full flex-col items-center justify-between p-4 md:flex-row md:px-2 md:py-0">
      {/* Mobile layout */}
      <div className="relative flex w-full flex-row items-end md:hidden">
        <div className="mb-5 flex w-1/3 items-center justify-center gap-2">
          <div className="text-theme-600 text-sm">
            {audioOn ? (
              <SpeakerSimpleHigh
                size={24}
                className="text-theme-500"
                onClick={() => {
                  setAudioOn(false);
                  stopTtsAudio();
                }}
              />
            ) : (
              <SpeakerSimpleSlash
                size={24}
                className="text-theme-300"
                onClick={() => setAudioOn(true)}
              />
            )}
          </div>
        </div>

        <div className="flex w-1/3 items-center justify-center space-x-9">
          <div className="flex flex-col items-center gap-2">
            {renderQuestionTypeButton()}
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
          <div className="text-theme-600 text-sm">
            {audioOn ? "Sound On" : "Sound Off"}
          </div>
        </div>

        <div className="flex items-stretch justify-center md:w-1/3">
          {renderQuestionTypeButton()}
        </div>

        <div className="flex items-center justify-end md:w-1/3">
          {showWebcamPreview && <WebcamPreview />}
        </div>
      </div>
    </div>
  );
};

export default InterviewBottomBarWithVideo;
