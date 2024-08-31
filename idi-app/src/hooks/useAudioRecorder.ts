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
  interviewSessionAtom,
  responsesAtom,
} from "../app/state/atoms";
import { useAtom } from "jotai";
import { Question } from "@shared/generated/client";
import { showWarningToast } from "@/app/utils/toastUtils";

interface AudioRecorderHook {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  submitAudio: (
    additionalData: TranscribeAndGenerateNextQuestionRequest,
  ) => Promise<any>;
  error: string | null;
  awaitingResponse: boolean; // New property
  noAnswerDetected: boolean;
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
  const [noAnswerDetected, setNoAnswerDetected] = useState(false);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingTimeout = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setIsRecording(true);

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

      mediaRecorder.current.start(100); // Collect data every second

      recordingTimeout.current = setTimeout(
        () => stopRecording(),
        MAX_RECORDING_TIME,
      );
    } catch (err) {
      console.error("Error starting recording:", err);
      setIsRecording(false);
      setError(
        "Failed to start recording. Please check your microphone permissions.",
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      setIsRecording(false);
      if (recordingTimeout.current) {
        clearTimeout(recordingTimeout.current);
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

        audioChunks.current = [];

        if (data.noAnswerDetected) {
          // No transcription was detected, so we should not update anything
          setAwaitingResponse(false);
          showWarningToast("Sorry, I couldn't hear you. Please try again!");
          setNoAnswerDetected(true);
          return;
        }

        setNoAnswerDetected(false);

        if (data.isFollowUp && data.followUpQuestion) {
          setCurrentQuestion(data.followUpQuestion);
          setFollowUpQuestions([...followUpQuestions, data.followUpQuestion]);
        } else if (data.nextQuestionId) {
          const nextQuestionId = data.nextQuestionId;
          const nextQuestion = baseQuestions.find(
            (question) => question.id === nextQuestionId,
          );
          setCurrentQuestion(nextQuestion as Question);
        } else {
          // No next question, this was the final question
          setInterviewSession({
            ...interviewSession!,
            status: "COMPLETED",
          });
        }

        // Clear audio chunks after successful submission
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
    noAnswerDetected,
    isRecording,
    startRecording,
    stopRecording,
    submitAudio,
    error,
  };
}
