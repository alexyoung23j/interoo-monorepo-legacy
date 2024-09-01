import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Microphone } from "@phosphor-icons/react";
import { SyncLoader, ClipLoader } from "react-spinners";
import { api } from "@/trpc/react";
import { cx } from "@/tailwind/styling";
import { isColorLight } from "@/app/utils/color";
import { useTranscriptionRecorder } from "@/app/api/useTranscriptionRecorder";
import { useChunkedMediaUploader } from "@/app/api/useChunkedMediaUploader";
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
  currentResponseAtom,
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

interface InterviewBottomBarProps {
  organization: Organization;
  study: Study & { questions: Question[] };
  refetchInterviewSession: () => void;
  multipleChoiceOptionSelectionId: string | null;
  rangeSelectionValue: number | null;
  handleSubmitMultipleChoiceResponse: () => void;
  awaitingOptionResponse: boolean;
  interviewSessionRefetching: boolean;
  handleSubmitRangeResponse: () => void;
}

const InterviewBottomBar: React.FC<InterviewBottomBarProps> = ({
  organization,
  study,
  refetchInterviewSession,
  multipleChoiceOptionSelectionId,
  rangeSelectionValue,
  handleSubmitMultipleChoiceResponse,
  awaitingOptionResponse,
  interviewSessionRefetching,
  handleSubmitRangeResponse,
}) => {
  const [currentQuestion] = useAtom(currentQuestionAtom);
  const [currentResponse, setCurrentResponse] = useAtom(currentResponseAtom);
  const [interviewSession] = useAtom(interviewSessionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [followUpQuestions] = useAtom(followUpQuestionsAtom);

  const createOpenEndedResponse =
    api.responses.createOpenEndedResponse.useMutation();

  const transcriptionRecorder = useTranscriptionRecorder({
    baseQuestions: study.questions,
  });

  const chunkedMediaUploader = useChunkedMediaUploader();

  const startResponse = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("getUserMedia is not supported in this browser");
      return;
    }

    try {
      let newResponse;
      if (currentQuestion) {
        const isFollowUpQuestion = "followUpQuestionOrder" in currentQuestion;
        newResponse = await createOpenEndedResponse.mutateAsync({
          questionId: isFollowUpQuestion
            ? ((currentQuestion as FollowUpQuestion).parentQuestionId ?? "")
            : currentQuestion.id,
          interviewSessionId: interviewSession?.id ?? "",
          followUpQuestionId: isFollowUpQuestion
            ? currentQuestion.id
            : undefined,
        });
        setCurrentResponse(newResponse);
        setResponses([...responses, newResponse]);
      }

      if (newResponse) {
        const uploadUrlRequest: UploadUrlRequest = {
          organizationId: organization.id,
          studyId: study.id,
          questionId: currentQuestion?.id ?? "",
          responseId: newResponse.id,
          fileExtension: "webm",
          contentType: study.videoEnabled ? "video/webm" : "audio/webm",
        };
        await chunkedMediaUploader.startRecording(
          uploadUrlRequest,
          study.videoEnabled || false,
        );
      }

      // Start transcription recording regardless of video being enabled or not
      await transcriptionRecorder.startRecording();
    } catch (err) {
      console.error("Error starting response:", err);
      showErrorToast("Error starting response. Please try again.");
    }
  };

  const stopResponse = async () => {
    await chunkedMediaUploader.stopRecording();
    transcriptionRecorder.stopRecording();

    try {
      const requestBody: TranscribeAndGenerateNextQuestionRequest =
        calculateTranscribeAndGenerateNextQuestionRequest({
          currentQuestion,
          interviewSession,
          study,
          responses,
          followUpQuestions,
          currentResponseId: currentResponse?.id ?? "",
        });

      const data = await transcriptionRecorder.submitAudio(requestBody);
      console.log({ requestBody, response: data });
    } catch (err) {
      console.error("Error submitting audio:", err);
      showErrorToast("Error submitting audio. Please try again.");
    }
  };

  const renderOpenEndedButton = () => (
    <>
      <Button
        variant="unstyled"
        className={cx(
          "h-14 w-14 rounded-sm border border-black border-opacity-25",
          transcriptionRecorder.isRecording
            ? "bg-org-secondary hover:opacity-80"
            : "bg-neutral-100 hover:bg-neutral-300",
        )}
        onClick={
          transcriptionRecorder.isRecording ? stopResponse : startResponse
        }
      >
        {transcriptionRecorder.isRecording ? (
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
        ) : transcriptionRecorder.awaitingResponse ||
          interviewSessionRefetching ? (
          <ClipLoader size={16} color="#525252" />
        ) : (
          <Microphone className="size-8 text-neutral-600" />
        )}
      </Button>
      <div className="mt-3 text-sm text-neutral-500 md:absolute md:-bottom-[1.75rem]">
        {transcriptionRecorder.isRecording
          ? "Click when finished speaking"
          : transcriptionRecorder.awaitingResponse
            ? "Thinking..."
            : "Click to speak"}
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
        {awaitingOptionResponse || interviewSessionRefetching ? (
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
        {awaitingOptionResponse || interviewSessionRefetching ? (
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

  return (
    <div className="mb-2 flex w-full flex-col items-center justify-between bg-off-white p-8 md:flex-row">
      <div className="flex gap-2 md:w-1/3">
        <Switch className="hidden data-[state=checked]:bg-org-secondary md:block" />
        <div className="hidden text-sm text-neutral-400 md:block">Sound on</div>
      </div>
      <div className="relative flex flex-col items-center md:w-1/3">
        <div className="mb-8 md:hidden">
          <WebcamPreview />
        </div>
        {renderQuestionTypeButton()}
      </div>
      <div className="hidden items-center justify-end md:flex md:w-1/3">
        <WebcamPreview />
      </div>
    </div>
  );
};

export default InterviewBottomBar;
