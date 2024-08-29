import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import React from "react";
import { Microphone } from "@phosphor-icons/react";
import { isColorLight } from "@/app/utils/color";
import {
  InterviewSession,
  Organization,
  Question,
} from "@shared/generated/client";
import { useAudioRecorder } from "@/app/api/useAudioRecorder";
import SyncLoader from "react-spinners/SyncLoader";

const InterviewBottomBar: React.FC<{
  organization: Organization;
  question: Question;
  interviewSession: InterviewSession;
}> = ({ organization, question, interviewSession }) => {
  const isBackgroundLight = isColorLight(organization.secondaryColor ?? "");
  const { isRecording, startRecording, stopRecording, submitAudio } =
    useAudioRecorder();

  const startResponse = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia is not supported in this browser");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // If we get here, we have microphone access
      await startRecording();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      // Handle the error, perhaps by showing a message to the user
      alert("Please grant microphone access to record your response.");
      return;
    }
  };

  const stopResponse = async () => {
    await stopRecording();
    // await submitAudio();
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
            <Microphone
              className={`size-8 ${isBackgroundLight ? "text-neutral-600" : "text-off-white"}`}
            />
          </Button>
        )}
        <div className="mt-3 text-sm text-neutral-500 md:absolute md:-bottom-[1.75rem]">
          {isRecording ? "Click when finished speaking " : "Click to speak"}
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
