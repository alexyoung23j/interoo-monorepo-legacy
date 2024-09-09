import React, { useCallback, useState, useEffect, useRef } from "react";
import { DisplayQuestion } from "./DisplayQuestion";
import {
  FollowUpQuestion,
  InterviewSession,
  Organization,
  Question,
  Study,
  Response,
} from "@shared/generated/client";
import { api } from "@/trpc/react";
import {
  currentQuestionAtom,
  responsesAtom,
  interviewSessionAtom,
  followUpQuestionsAtom,
  currentResponseAndUploadUrlAtom,
} from "@/app/state/atoms";
import { useAtom, useSetAtom } from "jotai";
import InterviewBottomBarWithVideo from "./interviewBottomBarWithVideo";
import { useTtsAudio } from "@/hooks/useTtsAudio";

interface InterviewPerformContentProps {
  study: Study & {
    questions: Question[];
    boostedKeywords: {
      id: string;
      keyword: string;
      definition: string | null;
      studyId: string;
    }[];
  };
  organization: Organization;
  interviewSessionRefetching: boolean;
}

export const InterviewPerformContent: React.FC<
  InterviewPerformContentProps
> = ({ organization, study, interviewSessionRefetching }) => {
  const [currentQuestion, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);
  const setCurrentResponseAndUploadUrl = useSetAtom(
    currentResponseAndUploadUrlAtom,
  );

  const [multipleChoiceOptionSelectionId, setMultipleChoiceOptionSelectionId] =
    useState<string | null>(null);
  const [rangeSelectionValue, setRangeSelectionValue] = useState<number | null>(
    null,
  );
  const [awaitingOptionResponse, setAwaitingOptionResponse] = useState(false);

  const {
    isLoading: ttsAudioLoading,
    isPlaying: ttsAudioPlaying,
    error: ttsAudioError,
    playAudio: playTtsAudio,
    stopAudio: stopTtsAudio,
    audioDuration: ttsAudioDuration,
  } = useTtsAudio();

  // Update the response to include the user's selection- or create in case user answers
  // before we get a chance to get the signed url and create the response on the backend
  const createOrUpdateMultipleChoiceResponse =
    api.responses.createOrUpdateMultipleChoiceResponse.useMutation();

  const createOrUpdateRangeResponse =
    api.responses.createOrUpdateRangeResponse.useMutation();

  const getNextQuestion = useCallback(
    (currentQuestion: Question) => {
      const nextQuestionNumber = currentQuestion.questionOrder + 1;
      return (
        study.questions.find((q) => q.questionOrder === nextQuestionNumber) ??
        null
      );
    },
    [study.questions],
  );

  const isLastQuestion = useCallback(
    (currentQuestion: Question) => {
      return currentQuestion.questionOrder === study.questions.length - 1;
    },
    [study.questions],
  );

  const handleSubmitMultipleChoiceResponse = () => {
    if (!multipleChoiceOptionSelectionId || !currentQuestion) return;
    setAwaitingOptionResponse(true);

    const nextQuestion = getNextQuestion(currentQuestion as Question);
    const wasFinalQuestion = isLastQuestion(currentQuestion as Question);

    if (wasFinalQuestion) {
      console.log("wasFinalQuestion");
      setInterviewSession((prev) => ({
        ...prev!,
        status: "COMPLETED",
      }));
      createOrUpdateMultipleChoiceResponse.mutate({
        multipleChoiceOptionSelectionId: multipleChoiceOptionSelectionId,
        interviewSessionId: interviewSession?.id ?? "",
        studyId: study.id,
        currentQuestionOrder: (currentQuestion as Question).questionOrder,
        questionId: (currentQuestion as Question).id,
      });
      setAwaitingOptionResponse(false);
      setMultipleChoiceOptionSelectionId(null);
      return;
    }

    setCurrentQuestion(nextQuestion);

    createOrUpdateMultipleChoiceResponse.mutate({
      multipleChoiceOptionSelectionId: multipleChoiceOptionSelectionId,
      interviewSessionId: interviewSession?.id ?? "",
      studyId: study.id,
      currentQuestionOrder: (currentQuestion as Question).questionOrder,
      questionId: (currentQuestion as Question).id,
    });

    setAwaitingOptionResponse(false);
    setMultipleChoiceOptionSelectionId(null);
  };

  const handleSubmitRangeResponse = () => {
    if (!rangeSelectionValue || !currentQuestion) return;
    setAwaitingOptionResponse(true);

    const nextQuestion = getNextQuestion(currentQuestion as Question);
    const wasFinalQuestion = isLastQuestion(currentQuestion as Question);

    setCurrentQuestion(nextQuestion);

    if (wasFinalQuestion) {
      setInterviewSession((prev) => ({
        ...prev!,
        status: "COMPLETED",
      }));
    }

    createOrUpdateRangeResponse.mutate({
      rangeSelection: rangeSelectionValue,
      interviewSessionId: interviewSession?.id ?? "",
      studyId: study.id,
      currentQuestionOrder: (currentQuestion as Question).questionOrder,
      questionId: (currentQuestion as Question).id,
    });

    setAwaitingOptionResponse(false);
    setRangeSelectionValue(null);
  };

  useEffect(() => {
    const fetchUploadUrlAndCreateResponse = async () => {
      if (!currentQuestion || !interviewSession) return;

      try {
        const isFollowUpQuestion = "followUpQuestionOrder" in currentQuestion;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-current-question-metadata`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              organizationId: organization.id,
              studyId: study.id,
              questionId: isFollowUpQuestion
                ? currentQuestion.parentQuestionId
                : currentQuestion.id,
              interviewSessionId: interviewSession.id,
              followUpQuestionId: isFollowUpQuestion
                ? currentQuestion.id
                : null,
              fileExtension: "webm",
              contentType: study.videoEnabled ? "video/webm" : "audio/webm",
            }),
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data: { sessionUrl: string; newResponse: Response } =
          await response.json();
        console.log("Upload URL fetched successfully:", data.sessionUrl);
        setCurrentResponseAndUploadUrl({
          response: data.newResponse,
          uploadSessionUrl: data.sessionUrl,
        });
      } catch (error) {
        console.error("Error fetching upload URL:", error);
      }
    };

    void fetchUploadUrlAndCreateResponse();
  }, [currentQuestion, setCurrentResponseAndUploadUrl]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <DisplayQuestion
          key={currentQuestion?.id}
          organization={organization}
          multipleChoiceOptionSelectionId={multipleChoiceOptionSelectionId}
          setMultipleChoiceOptionSelectionId={
            setMultipleChoiceOptionSelectionId
          }
          rangeSelectionValue={rangeSelectionValue}
          setRangeSelectionValue={setRangeSelectionValue}
        />
      </div>
      <InterviewBottomBarWithVideo
        organization={organization}
        study={study}
        multipleChoiceOptionSelectionId={multipleChoiceOptionSelectionId}
        rangeSelectionValue={rangeSelectionValue}
        handleSubmitMultipleChoiceResponse={handleSubmitMultipleChoiceResponse}
        awaitingOptionResponse={awaitingOptionResponse}
        interviewSessionRefetching={interviewSessionRefetching}
        handleSubmitRangeResponse={handleSubmitRangeResponse}
        playTtsAudio={playTtsAudio}
        stopTtsAudio={stopTtsAudio}
      />
    </div>
  );
};
