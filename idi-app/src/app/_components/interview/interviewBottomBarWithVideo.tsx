import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Microphone } from "@phosphor-icons/react";
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
import {
  TranscribeAndGenerateNextQuestionRequest,
  UploadUrlRequest,
} from "@shared/types";
import { calculateTranscribeAndGenerateNextQuestionRequest } from "@/app/utils/functions";
import WebcamPreview from "./WebcamPreview";
import { useTranscriptionRecorder } from "@/hooks/useTranscriptionRecorder";
import { useTtsAudio } from "@/hooks/useTtsAudio";

interface InterviewBottomBarProps {
  organization: Organization;
  study: Study & { questions: Question[] };
  multipleChoiceOptionSelectionId: string | null;
  rangeSelectionValue: number | null;
  handleSubmitMultipleChoiceResponse: () => void;
  awaitingOptionResponse: boolean;
  interviewSessionRefetching: boolean;
  handleSubmitRangeResponse: () => void;
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
    isLoading: ttsAudioLoading,
    isPlaying: ttsAudioPlaying,
    error: ttsAudioError,
    playAudio: playTtsAudio,
    stopAudio: ttsAudioStop,
    audioDuration: ttsAudioDuration,
  } = useTtsAudio();

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
      ttsAudioStop();
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
        return `Uploading... ${uploadProgress.toFixed(0)}%`;
      case "slow":
        return "Hang on - almost there!";
      case "verySlow":
        return "Your network is a bit slow- your video may be getting dropped";
      case "failed":
        return "Upload failed. Click to retry.";
      default:
        return isFullyRecording
          ? "Click when finished speaking"
          : "Click to speak";
    }
  };

  const renderOpenEndedButton = () => (
    <>
      <Button
        variant="unstyled"
        className={cx(
          "h-14 w-14 rounded-sm border border-black border-opacity-25",
          isFullyRecording || uploadStatus !== "idle"
            ? "bg-org-secondary hover:opacity-80"
            : "bg-neutral-100 hover:bg-neutral-300",
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
          uploadStatus === "verySlow"
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
      <div className="mt-3 text-sm text-neutral-500 md:absolute md:-bottom-[1.75rem]">
        {getButtonText()}
      </div>
    </>
  );

  const renderMultipleChoiceButton = () => (
    <>
      <Button
        variant="unstyled"
        className={cx(
          "h-14 w-14 rounded-sm border border-black border-opacity-25 hover:bg-neutral-300",
          multipleChoiceOptionSelectionId
            ? "bg-org-secondary"
            : "bg-neutral-100",
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
      {!awaitingOptionResponse && multipleChoiceOptionSelectionId && (
        <div className="mt-3 text-sm text-neutral-500 md:absolute md:-bottom-[1.75rem]">
          Click to submit
        </div>
      )}
    </>
  );

  const renderRangeButton = () => (
    <>
      <Button
        variant="unstyled"
        className={cx(
          "h-14 w-14 rounded-sm border border-black border-opacity-25 hover:bg-neutral-300",
          rangeSelectionValue !== null ? "bg-org-secondary" : "bg-neutral-100",
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
      {!awaitingOptionResponse && rangeSelectionValue !== null && (
        <div className="mt-3 text-sm text-neutral-500 md:absolute md:-bottom-[1.75rem]">
          Click to submit
        </div>
      )}
    </>
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

  const showWebcamPreview = study.videoEnabled && isOpenEndedQuestion;

  return (
    <div className="mb-2 flex w-full flex-col items-center justify-between bg-off-white p-8 md:flex-row">
      <div className="flex gap-2 md:w-1/3">
        <Switch
          className="hidden data-[state=checked]:bg-org-secondary md:block"
          checked={audioOn}
          onCheckedChange={(checked) => {
            if (!checked) {
              ttsAudioStop();
            }
            setAudioOn(checked);
          }}
        />
        <div className="hidden text-sm text-neutral-400 md:block">
          {audioOn ? "Sound on" : "Sound off"}
        </div>
      </div>

      {/* Position webcam differently on different screen sizes */}
      <div className="relative flex flex-col items-center md:w-1/3">
        {showWebcamPreview && (
          <div className="mb-8 md:hidden">
            <WebcamPreview />
          </div>
        )}
        {renderQuestionTypeButton()}
      </div>
      <div className="hidden items-center justify-end md:flex md:w-1/3">
        {showWebcamPreview && <WebcamPreview />}
      </div>
    </div>
  );
};

export default InterviewBottomBarWithVideo;
