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
import * as Sentry from "@sentry/nextjs";

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
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
    null,
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      setIsRecording(false);
      Sentry.captureMessage("Stopping recording", { level: "info" });
      if (recordingTimeout.current) {
        clearTimeout(recordingTimeout.current);
      }

      // Get tracks before stopping
      const tracks = mediaRecorder.current.stream.getTracks();

      // Stop and disable all tracks
      tracks.forEach((track) => {
        track.stop();
        track.enabled = false;
      });

      // Release the stream entirely
      mediaRecorder.current.stream.getTracks().forEach((track) => {
        mediaRecorder.current!.stream.removeTrack(track);
      });

      mediaRecorder.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Clean up first
      if (mediaRecorder.current) {
        const tracks = mediaRecorder.current.stream.getTracks();
        tracks.forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        mediaRecorder.current = null;
      }

      // Reset state before starting
      audioChunks.current = [];
      setIsRecording(false);
      setRecordingStartTime(null);

      // Get new stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported MIME type
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
        Sentry.captureMessage(
          "No preferred mime types supported, falling back to default",
          {
            level: "warning",
          },
        );
      }

      // Setup new recorder with supported MIME type
      mediaRecorder.current = new MediaRecorder(stream, { mimeType });

      // Set up event handlers before starting
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      // Finally start recording
      setRecordingStartTime(Date.now());
      setIsRecording(true);
      mediaRecorder.current.start(100);

      // Set timeout after everything is running
      recordingTimeout.current = setTimeout(() => {
        stopRecording();
        showWarningToast("Recording time limit reached (10 minutes).");
        Sentry.captureMessage(
          "Recording time limit reached, stopped recording",
          {
            level: "warning",
          },
        );
      }, MAX_RECORDING_TIME);
    } catch (err) {
      Sentry.captureException(err, { level: "error" });
      console.error("Error starting recording:", err);
      setError(
        "Failed to start recording. Please check your microphone permissions.",
      );
    }
  }, [stopRecording]);

  const submitAudio = useCallback(
    async (additionalData: TranscribeAndGenerateNextQuestionRequest) => {
      if (audioChunks.current.length === 0) {
        Sentry.captureMessage(`No audio chunks to submit`, {
          level: "info",
        });
        return null;
      }

      const currentEndTime = Date.now();

      const mimeType =
        mediaRecorder.current?.mimeType ?? "audio/webm;codecs=opus";
      const audioBlob = new Blob(audioChunks.current, { type: mimeType });
      const formData = new FormData();
      formData.append(
        "audio",
        audioBlob,
        `recording.${mimeType.split("/")[1]}`,
      );

      const { thread, boostedKeywords, ...otherData } = additionalData;

      formData.append("thread", JSON.stringify(thread));
      formData.append("boostedKeywords", JSON.stringify(boostedKeywords));

      // Update otherData with the correct times as ISO strings
      otherData.currentResponseStartTime = new Date(
        recordingStartTime ?? Date.now(),
      ).toISOString();
      otherData.currentResponseEndTime = new Date(currentEndTime).toISOString();

      Object.entries(otherData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      try {
        Sentry.captureMessage(`Submitting audio to /api/audio-response`, {
          level: "info",
        });
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/audio-response`,
          {
            method: "POST",
            body: formData,
          },
        );
        Sentry.captureMessage(
          `Audio submitted, response status: ${response.status}`,
          {
            level: "info",
          },
        );

        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const transcribeAndGenerateNextQuestionResponse: TranscribeAndGenerateNextQuestionResponse =
          await response.json();

        audioChunks.current = [];
        Sentry.captureMessage("Received transcription response", {
          level: "info",
          extra: { response: transcribeAndGenerateNextQuestionResponse },
        });

        if (transcribeAndGenerateNextQuestionResponse.noAnswerDetected) {
          showWarningToast("Sorry, I couldn't hear you. Please try again!");
          setNoAnswerDetected(true);
          Sentry.captureMessage("No answer detected in transcription", {
            level: "info",
          });
          if (transcribeAndGenerateNextQuestionResponse.newSessionUrl) {
            setCurrentResponseAndUploadUrl((prev) => ({
              ...prev,
              uploadSessionUrl:
                transcribeAndGenerateNextQuestionResponse.newSessionUrl ?? null,
            }));
            Sentry.captureMessage(
              "Updated uploadSessionUrl with newSessionUrl",
              {
                level: "info",
                extra: {
                  newSessionUrl:
                    transcribeAndGenerateNextQuestionResponse.newSessionUrl,
                },
              },
            );
          }
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
          Sentry.captureMessage("Set next follow-up question", {
            level: "info",
            extra: {
              question:
                transcribeAndGenerateNextQuestionResponse.nextFollowUpQuestion,
            },
          });
        } else if (transcribeAndGenerateNextQuestionResponse.nextQuestionId) {
          const nextQuestionId =
            transcribeAndGenerateNextQuestionResponse.nextQuestionId;
          const nextQuestion = baseQuestions.find(
            (question) => question.id === nextQuestionId,
          );
          setCurrentQuestion(nextQuestion!);
          nextCurrentQuestion = nextQuestion!;
          Sentry.captureMessage("Set next question by ID", {
            level: "info",
            extra: { nextQuestionId, nextQuestion },
          });
        } else {
          setInterviewSession({
            ...interviewSession!,
            status: "COMPLETED",
          });
          setInterviewProgress("completed");
        }

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
            createdAt: new Date(recordingStartTime ?? Date.now()),
            updatedAt: new Date(currentEndTime),
            transcriptionBody: {},
          },
        ]);
        Sentry.captureMessage("Updated responses with new transcription", {
          level: "info",
          extra: { newResponse: transcribeAndGenerateNextQuestionResponse },
        });

        return { textToPlay: nextCurrentQuestion?.title };
      } catch (error) {
        Sentry.captureException(error, { level: "error" });
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
      recordingStartTime,
      setRecordingStartTime,
    ],
  );

  useEffect(() => {
    return () => {
      if (recordingTimeout.current) {
        clearTimeout(recordingTimeout.current);
      }
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stream.getTracks().forEach((track) => {
          track.stop();
        });
        mediaRecorder.current.stop();
      }
      audioChunks.current = [];
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
