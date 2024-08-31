import { api } from "@/trpc/react";
import {
  TranscribeAndGenerateNextQuestionRequest,
  TranscribeAndGenerateNextQuestionResponse,
} from "@shared/types";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  currentQuestionAtom,
  currentResponseAtom,
  followUpQuestionsAtom,
  responsesAtom,
} from "../state/atoms";
import { useAtom } from "jotai";
import { Question } from "@shared/generated/client";
import { UploadUrlRequest } from "@shared/types";

interface AudioRecorderHook {
  isRecording: boolean;
  startAudioOnlyRecording: (
    uploadUrlRequest: UploadUrlRequest,
  ) => Promise<void>;
  stopAudioOnlyRecording: () => void;
  submitAudio: (
    additionalData: TranscribeAndGenerateNextQuestionRequest,
  ) => Promise<any>;
  error: string | null;
  awaitingResponse: boolean; // New property
}

const MAX_RECORDING_TIME = 15 * 60 * 1000; // 15 minutes

export function useAudioRecorder({
  baseQuestions,
}: {
  baseQuestions: Question[];
}): AudioRecorderHook {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false); // New state
  const [, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [currentResponse, setCurrentResponse] = useAtom(currentResponseAtom);
  const [followUpQuestions, setFollowUpQuestions] = useAtom(
    followUpQuestionsAtom,
  );

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingTimeout = useRef<NodeJS.Timeout | null>(null);
  const uploadInterval = useRef<NodeJS.Timeout | null>(null);
  const signedUrl = useRef<{
    signedUrl: string;
    path: string;
    token: string;
  } | null>(null);

  const getSignedUrl = async (uploadUrlRequest: UploadUrlRequest) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-signed-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadUrlRequest),
        credentials: "include",
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${await response.text()}`);
    }
    signedUrl.current = await response.json();
  };

  const uploadChunk = async (blob: Blob) => {
    if (!signedUrl.current) return;
    const url = signedUrl.current.signedUrl;
    await fetch(url, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": "audio/webm" },
    });
  };

  const startAudioOnlyRecording = useCallback(
    async (uploadUrlRequest: UploadUrlRequest) => {
      try {
        await getSignedUrl(uploadUrlRequest);
        setIsRecording(true);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

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

        mediaRecorder.current.start(100); // Collect data every second

        recordingTimeout.current = setTimeout(
          () => stopAudioOnlyRecording(),
          MAX_RECORDING_TIME,
        );

        uploadInterval.current = setInterval(async () => {
          if (audioChunks.current.length > 0) {
            const blob = new Blob(audioChunks.current, { type: "audio/webm" });
            await uploadChunk(blob);
            audioChunks.current = [];
          }
        }, 10000);
      } catch (err) {
        console.error("Error starting recording:", err);
        setIsRecording(false);
        setError(
          "Failed to start recording. Please check your microphone permissions.",
        );
      }
    },
    [],
  );

  const stopAudioOnlyRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      setIsRecording(false);
      if (recordingTimeout.current) {
        clearTimeout(recordingTimeout.current);
      }
      if (uploadInterval.current) {
        clearInterval(uploadInterval.current);
      }
      // Add a short delay before stopping the recorder
      setTimeout(() => {
        mediaRecorder.current?.stop();
      }, 200); // 100ms delay
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

      // Handle the thread field separately
      const { thread, ...otherData } = additionalData;

      // Stringify the thread data
      formData.append("thread", JSON.stringify(thread));

      // Append other data
      Object.entries(otherData).forEach(([key, value]) => {
        formData.append(key, String(value));
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

        const data: TranscribeAndGenerateNextQuestionResponse =
          await response.json();

        if (data.isFollowUp && data.followUpQuestion) {
          setCurrentQuestion(data.followUpQuestion);
          setFollowUpQuestions([...followUpQuestions, data.followUpQuestion]);
        } else {
          const nextQuestionId = data.nextQuestionId;
          const nextQuestion = baseQuestions.find(
            (question) => question.id === nextQuestionId,
          );
          setCurrentQuestion(nextQuestion as Question);
        }

        // Clear audio chunks after successful submission
        audioChunks.current = [];
        setAwaitingResponse(false);
        setResponses(
          responses.map((response) =>
            response.id === currentResponse?.id
              ? { ...response, fastTranscribedText: data.transcribedText }
              : response,
          ),
        );

        return data;
      } catch (error) {
        console.error("Error submitting audio:", error);
        setError("Failed to submit audio. Please try again.");
        setAwaitingResponse(false);
        throw error;
      }
    },
    [responses, currentResponse, followUpQuestions],
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
    startAudioOnlyRecording: startAudioOnlyRecording,
    stopAudioOnlyRecording: stopAudioOnlyRecording,
    submitAudio,
    error,
  };
}
