import { api } from "@/trpc/react";
import { TranscribeAndGenerateNextQuestionRequest } from "@shared/types";
import { useState, useRef, useCallback, useEffect } from "react";

interface AudioRecorderHook {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  submitAudio: (
    additionalData: TranscribeAndGenerateNextQuestionRequest,
  ) => Promise<any>;
  error: string | null;
  awaitingResponse: boolean; // New property
}

const MAX_RECORDING_TIME = 15 * 60 * 1000; // 15 minutes

export function useAudioRecorder({
  interviewSessionId,
}: {
  interviewSessionId: string;
}): AudioRecorderHook {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false); // New state

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingTimeout = useRef<NodeJS.Timeout | null>(null);

  const { refetch: refetchInterviewSession } =
    api.interviews.getInterviewSession.useQuery({
      interviewSessionId,
    });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType;
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      } else {
        console.warn(
          "No preferred mime types supported, falling back to default",
        );
      }

      if (mimeType) {
        mediaRecorder.current = new MediaRecorder(stream, { mimeType });
      } else {
        mediaRecorder.current = new MediaRecorder(stream);
      }

      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.start(1000); // Collect data every second
      setIsRecording(true);

      recordingTimeout.current = setTimeout(
        () => stopRecording(),
        MAX_RECORDING_TIME,
      );
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(
        "Failed to start recording. Please check your microphone permissions.",
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (recordingTimeout.current) {
        clearTimeout(recordingTimeout.current);
      }
    }
  }, []);

  const submitAudio = useCallback(
    async (additionalData: TranscribeAndGenerateNextQuestionRequest) => {
      if (audioChunks.current.length === 0) return null;
      setAwaitingResponse(true); // Set to true when starting submission

      const mimeType =
        mediaRecorder.current?.mimeType || "audio/webm;codecs=opus";
      const audioBlob = new Blob(audioChunks.current, { type: mimeType });
      const formData = new FormData();
      formData.append(
        "audio",
        audioBlob,
        `recording.${mimeType.split("/")[1]}`,
      );

      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/audio-response`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log({ data });

        // Clear audio chunks after successful submission
        audioChunks.current = [];

        refetchInterviewSession().then(() => {
          setAwaitingResponse(false); // Set to false after successful response
        });

        return data;
      } catch (error) {
        console.error("Error submitting audio:", error);
        setError("Failed to submit audio. Please try again.");
        throw error;
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (recordingTimeout.current) {
        clearTimeout(recordingTimeout.current);
      }
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  return {
    awaitingResponse,
    isRecording,
    startRecording,
    stopRecording,
    submitAudio,
    error,
  };
}
