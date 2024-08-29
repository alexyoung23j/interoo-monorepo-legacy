import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import React, { useState } from "react";
import { Microphone } from "@phosphor-icons/react";
import { isColorLight } from "@/app/utils/color";
import {
  FollowUpQuestion,
  InterviewSession,
  Organization,
  Question,
  Study,
  Response,
} from "@shared/generated/client";
import { useAudioRecorder } from "@/app/api/useAudioRecorder";
import SyncLoader from "react-spinners/SyncLoader";
import { useConversationHistory } from "@/app/hooks/useConversationHistory";
import ClipLoader from "react-spinners/ClipLoader";
import { api } from "@/trpc/react";

const InterviewBottomBar: React.FC<{
  organization: Organization;
  question: Question;
  interviewSession: InterviewSession & {
    responses: Response[];
    FollowUpQuestions: FollowUpQuestion[];
  };
  study: Study & { questions: Question[] };
  refetchInterviewSession: () => void;
}> = ({
  organization,
  question,
  interviewSession,
  study,
  refetchInterviewSession,
}) => {
  const isBackgroundLight = isColorLight(organization.secondaryColor ?? "");
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(
    null,
  );
  const createResponse = api.responses.createResponse.useMutation();

  console.log({ interviewSession });

  const {
    isRecording,
    startRecording,
    stopRecording,
    submitAudio,
    awaitingResponse,
  } = useAudioRecorder({ interviewSessionId: interviewSession.id ?? "" });

  const conversationHistory = useConversationHistory(
    study,
    question.id,
    currentResponseId ?? "",
    interviewSession,
  );

  console.log({ conversationHistory });

  const startResponse = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia is not supported in this browser");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // If we get here, we have microphone access
      await startRecording();
      const response = await createResponse.mutateAsync({
        questionId: question.id,
        interviewSessionId: interviewSession.id,
      });
      setCurrentResponseId(response.id);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      // Handle the error, perhaps by showing a message to the user
      alert("Please grant microphone access to record your response.");
      return;
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

  return (
    <div className="mb-2 flex w-full items-center justify-between bg-off-white p-8">
      <div className="flex gap-2 md:w-1/3">
        <Switch className="hidden data-[state=checked]:bg-org-secondary md:block" />
        <div className="hidden text-sm text-neutral-400 md:block">Sound on</div>
      </div>

      <div className="relative flex flex-col items-center md:w-1/3">
        {isRecording ? (
          <Button
            variant="unstyled"
            className="h-14 w-14 rounded-sm border border-black border-opacity-25 bg-org-secondary hover:opacity-80"
            onClick={stopResponse}
          >
            <div className="flex h-1 items-center justify-center">
              <SyncLoader
                size={4}
                color={isBackgroundLight ? "black" : "white"}
                speedMultiplier={0.5}
                margin={3}
              />
            </div>
          </Button>
        ) : (
          <Button
            variant="unstyled"
            className="h-14 w-14 rounded-sm border border-black border-opacity-25 bg-neutral-100 hover:bg-neutral-300"
            onClick={startResponse}
          >
            {awaitingResponse ? (
              <ClipLoader size={16} color="#525252" />
            ) : (
              <Microphone className={`size-8 text-neutral-600`} />
            )}
          </Button>
        )}
        <div className="mt-3 text-sm text-neutral-500 md:absolute md:-bottom-[1.75rem]">
          {isRecording
            ? "Click when finished speaking"
            : awaitingResponse
              ? "Thinking..."
              : "Click to speak"}
        </div>
      </div>

      <div className="flex justify-end md:w-1/3">
        {/* Right side content */}
        <div></div>
      </div>
    </div>
  );
};

export default InterviewBottomBar;
