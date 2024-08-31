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

export function useTranscriptionRecorder({
  baseQuestions,
}: {
  baseQuestions: Question[];
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false); // New state
  const [, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [currentResponse, setCurrentResponse] = useAtom(currentResponseAtom);
  const [followUpQuestions, setFollowUpQuestions] = useAtom(
    followUpQuestionsAtom,
  );
  const recordingTimeout = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      setIsRecording(true);
      mediaRecorder.current.start(100);
    } catch (err) {
      console.error("Error starting recording:", err);
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
      mediaRecorder.current.stop();
    }
  }, []);

  const submitAudio = useCallback(
    async (additionalData: TranscribeAndGenerateNextQuestionRequest) => {
      if (audioChunks.current.length === 0) return null;
      setAwaitingResponse(true);

      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

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
    startRecording: startRecording,
    stopRecording: stopRecording,
    submitAudio,
    error,
  };
}
