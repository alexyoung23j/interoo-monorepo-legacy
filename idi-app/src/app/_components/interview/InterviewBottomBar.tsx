import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Microphone } from "@phosphor-icons/react";
import { SyncLoader, ClipLoader } from "react-spinners";
import { api } from "@/trpc/react";
import { cx } from "@/tailwind/styling";
import { isColorLight } from "@/app/utils/color";
import { useAudioRecorder } from "@/app/api/useAudioRecorder";
import { useConversationHistory } from "@/app/hooks/useConversationHistory";
import {
  FollowUpQuestion,
  InterviewSession,
  Organization,
  Question,
  Study,
  Response,
  QuestionType,
} from "@shared/generated/client";

interface InterviewBottomBarProps {
  organization: Organization;
  question: Question;
  interviewSession: InterviewSession & {
    responses: Response[];
    FollowUpQuestions: FollowUpQuestion[];
  };
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
  question,
  interviewSession,
  study,
  refetchInterviewSession,
  multipleChoiceOptionSelectionId,
  rangeSelectionValue,
  handleSubmitMultipleChoiceResponse,
  awaitingOptionResponse,
  interviewSessionRefetching,
  handleSubmitRangeResponse,
}) => {
  const isBackgroundLight = isColorLight(organization.secondaryColor ?? "");
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(
    null,
  );
  const createOpenEndedResponse =
    api.responses.createOpenEndedResponse.useMutation();

  const {
    isRecording,
    startRecording,
    stopRecording,
    submitAudio,
    awaitingResponse: awaitingLLMResponse,
  } = useAudioRecorder({ interviewSessionId: interviewSession.id ?? "" });

  const conversationHistory = useConversationHistory(
    study,
    question.id,
    currentResponseId ?? "",
    interviewSession,
  );

  const startResponse = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("getUserMedia is not supported in this browser");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await startRecording();
      const response = await createOpenEndedResponse.mutateAsync({
        questionId: question.id,
        interviewSessionId: interviewSession.id,
      });
      setCurrentResponseId(response.id);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Please grant microphone access to record your response.");
    }
  };

  const stopResponse = async () => {
    await stopRecording();
    if (conversationHistory) {
      const data = await submitAudio(conversationHistory);
      console.log({ data });
      refetchInterviewSession();
    }
  };

  const renderOpenEndedButton = () => (
    <>
      <Button
        variant="unstyled"
        className={cx(
          "h-14 w-14 rounded-sm border border-black border-opacity-25",
          isRecording
            ? "bg-org-secondary hover:opacity-80"
            : "bg-neutral-100 hover:bg-neutral-300",
        )}
        onClick={isRecording ? stopResponse : startResponse}
      >
        {isRecording ? (
          <SyncLoader
            size={4}
            color={isBackgroundLight ? "black" : "white"}
            speedMultiplier={0.5}
            margin={3}
          />
        ) : awaitingLLMResponse || interviewSessionRefetching ? (
          <ClipLoader size={16} color="#525252" />
        ) : (
          <Microphone className="size-8 text-neutral-600" />
        )}
      </Button>
      <div className="mt-3 text-sm text-neutral-500 md:absolute md:-bottom-[1.75rem]">
        {isRecording
          ? "Click when finished speaking"
          : awaitingLLMResponse
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
                : isBackgroundLight
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
                : isBackgroundLight
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
    switch (question.questionType) {
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
    <div className="mb-2 flex w-full items-center justify-between bg-off-white p-8">
      <div className="flex gap-2 md:w-1/3">
        <Switch className="hidden data-[state=checked]:bg-org-secondary md:block" />
        <div className="hidden text-sm text-neutral-400 md:block">Sound on</div>
      </div>
      <div className="relative flex flex-col items-center md:w-1/3">
        {renderQuestionTypeButton()}
      </div>
      <div className="flex justify-end md:w-1/3">
        {/* Right side content */}
        <div></div>
      </div>
    </div>
  );
};

export default InterviewBottomBar;
