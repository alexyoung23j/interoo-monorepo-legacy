import type {
  TranscribeAndGenerateNextQuestionRequest,
  TranscribeAndGenerateNextQuestionResponse,
} from "@shared/types";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  currentQuestionAtom,
  followUpQuestionsAtom,
  interviewSessionAtom,
  responsesAtom,
  currentResponseAndUploadUrlAtom,
  interviewProgressAtom,
} from "../app/state/atoms";
import { useAtom } from "jotai";
import type { FollowUpQuestion, Question } from "@shared/generated/client";
import { showWarningToast } from "@/app/utils/toastUtils";
import { useRouter, useSearchParams } from "next/navigation";

interface AudioRecorderHook {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  submitAudio: (
    additionalData: TranscribeAndGenerateNextQuestionRequest,
  ) => Promise<{ textToPlay: string | undefined } | null>;
  error: string | null;
  noAnswerDetected: boolean;
}

const MAX_RECORDING_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

export function useTranscriptionRecorder({
  baseQuestions,
}: {
  baseQuestions: Question[];
}): AudioRecorderHook {
  const [currentResponseAndUploadUrl, setCurrentResponseAndUploadUrl] = useAtom(
    currentResponseAndUploadUrlAtom,
  );

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [followUpQuestions, setFollowUpQuestions] = useAtom(
    followUpQuestionsAtom,
  );
  const [noAnswerDetected, setNoAnswerDetected] = useState(false);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);
  const [_, setInterviewProgress] = useAtom(interviewProgressAtom);
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

      mediaRecorder.current.start(100); // collect data every 100ms

      recordingTimeout.current = setTimeout(() => {
        stopRecording();
        showWarningToast("Recording time limit reached (10 minutes).");
      }, MAX_RECORDING_TIME);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(
        "Failed to start recording. Please check your microphone permissions.",
      );
    }
  }, [stopRecording]);

  const submitAudio = useCallback(
    async (additionalData: TranscribeAndGenerateNextQuestionRequest) => {
      if (audioChunks.current.length === 0) return null;

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
        const transcribeAndGenerateNextQuestionResponse: TranscribeAndGenerateNextQuestionResponse =
          await response.json();

        audioChunks.current = [];

        if (transcribeAndGenerateNextQuestionResponse.noAnswerDetected) {
          showWarningToast("Sorry, I couldn't hear you. Please try again!");
          setNoAnswerDetected(true);
          return null;
        }

        setNoAnswerDetected(false);

        let nextCurrentQuestion: Question | FollowUpQuestion | null = null;

        if (
          transcribeAndGenerateNextQuestionResponse.isFollowUp &&
          transcribeAndGenerateNextQuestionResponse.nextFollowUpQuestion
        ) {
          setCurrentQuestion(
            transcribeAndGenerateNextQuestionResponse.nextFollowUpQuestion,
          );
          nextCurrentQuestion =
            transcribeAndGenerateNextQuestionResponse.nextFollowUpQuestion;
          setFollowUpQuestions([
            ...followUpQuestions,
            transcribeAndGenerateNextQuestionResponse.nextFollowUpQuestion,
          ]);
        } else if (transcribeAndGenerateNextQuestionResponse.nextQuestionId) {
          const nextQuestionId =
            transcribeAndGenerateNextQuestionResponse.nextQuestionId;
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
          setInterviewProgress("completed");
        }

        console.log(
          "transcribeAndGenerateNextQuestionResponse",
          transcribeAndGenerateNextQuestionResponse,
        );

        setResponses([
          ...responses,
          {
            id: transcribeAndGenerateNextQuestionResponse.id,
            questionId: transcribeAndGenerateNextQuestionResponse.questionId,
            fastTranscribedText:
              transcribeAndGenerateNextQuestionResponse.transcribedText,
            junkResponse:
              transcribeAndGenerateNextQuestionResponse.isJunkResponse,
            interviewSessionId: interviewSession!.id,
            followUpQuestionId:
              currentResponseAndUploadUrl.response?.followUpQuestionId ?? null,
            rangeSelection: null,
            multipleChoiceOptionId: null,
            createdAt: new Date(), // Created and updatedAt is not used for anything during the interview itself
            updatedAt: new Date(),
          },
        ]);
        console.log("followUpQuestions", followUpQuestions);
        console.log("responses", responses);

        return { textToPlay: nextCurrentQuestion?.title };
      } catch (error) {
        console.error("Error submitting audio:", error);
        setError("Failed to submit audio. Please try again.");
        throw error;
      }
    },
    [
      baseQuestions,
      currentResponseAndUploadUrl,
      followUpQuestions,
      interviewSession,
      responses,
      setCurrentQuestion,
      setFollowUpQuestions,
      setInterviewSession,
      setResponses,
      setCurrentResponseAndUploadUrl,
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
    noAnswerDetected,
    isRecording,
    startRecording,
    stopRecording,
    submitAudio,
    error,
  };
}
