import type {
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
import type { FollowUpQuestion, Question } from "@shared/generated/client";
import { showWarningToast } from "@/app/utils/toastUtils";

interface AudioRecorderHook {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  submitAudio: (
    additionalData: TranscribeAndGenerateNextQuestionRequest,
  ) => Promise<{ textToPlay: string | undefined } | null>;
  error: string | null;
  awaitingResponse: boolean;
  noAnswerDetected: boolean;
}

const MAX_RECORDING_TIME = 15 * 60 * 1000; // 15 minutes

export function useTranscriptionRecorder({
  baseQuestions,
}: {
  baseQuestions: Question[];
}): AudioRecorderHook {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [currentResponse] = useAtom(currentResponseAtom);
  const [followUpQuestions, setFollowUpQuestions] = useAtom(
    followUpQuestionsAtom,
  );
  const [noAnswerDetected, setNoAnswerDetected] = useState(false);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingTimeout = useRef<NodeJS.Timeout | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      setIsRecording(false);
      if (recordingTimeout.current) {
        clearTimeout(recordingTimeout.current);
      }
      // Add a short delay before stopping the recorder
      setTimeout(() => {
        mediaRecorder.current?.stop();
      }, 200); // 200ms delay
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setIsRecording(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType: string | undefined;
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

      mediaRecorder.current = new MediaRecorder(stream, { mimeType });

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
  }, [stopRecording]);

  const submitAudio = useCallback(
    async (additionalData: TranscribeAndGenerateNextQuestionRequest) => {
      if (audioChunks.current.length === 0) return null;
      setAwaitingResponse(true);

      const mimeType =
        mediaRecorder.current?.mimeType ?? "audio/webm;codecs=opus";
      const audioBlob = new Blob(audioChunks.current, { type: mimeType });
      const formData = new FormData();
      formData.append(
        "audio",
        audioBlob,
        `recording.${mimeType.split("/")[1]}`,
      );

      const { thread, ...otherData } = additionalData;

      formData.append("thread", JSON.stringify(thread));

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

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data: TranscribeAndGenerateNextQuestionResponse =
          await response.json();

        audioChunks.current = [];

        if (data.noAnswerDetected) {
          setAwaitingResponse(false);
          showWarningToast("Sorry, I couldn't hear you. Please try again!");
          setNoAnswerDetected(true);
          return null;
        }

        setNoAnswerDetected(false);

        let nextCurrentQuestion: Question | FollowUpQuestion | null = null;

        if (data.isFollowUp && data.followUpQuestion) {
          setCurrentQuestion(data.followUpQuestion);
          nextCurrentQuestion = data.followUpQuestion;
          setFollowUpQuestions([...followUpQuestions, data.followUpQuestion]);
        } else if (data.nextQuestionId) {
          const nextQuestionId = data.nextQuestionId;
          const nextQuestion = baseQuestions.find(
            (question) => question.id === nextQuestionId,
          );
          setCurrentQuestion(nextQuestion!);
          nextCurrentQuestion = nextQuestion!;
        } else {
          setInterviewSession({
            ...interviewSession!,
            status: "COMPLETED",
          });
        }

        setAwaitingResponse(false);
        setResponses(
          responses.map((response) =>
            response.id === currentResponse?.id
              ? { ...response, fastTranscribedText: data.transcribedText }
              : response,
          ),
        );

        return { textToPlay: nextCurrentQuestion?.title };
      } catch (error) {
        console.error("Error submitting audio:", error);
        setError("Failed to submit audio. Please try again.");
        setAwaitingResponse(false);
        throw error;
      }
    },
    [
      baseQuestions,
      currentResponse,
      followUpQuestions,
      interviewSession,
      responses,
      setCurrentQuestion,
      setFollowUpQuestions,
      setInterviewSession,
      setResponses,
    ],
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
