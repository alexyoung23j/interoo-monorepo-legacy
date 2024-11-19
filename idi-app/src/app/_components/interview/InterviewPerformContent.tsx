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
  interviewProgressAtom,
} from "@/app/state/atoms";
import { useAtom, useSetAtom } from "jotai";
import InterviewBottomBarWithVideo from "./interviewBottomBarWithVideo";
import { getSupportedMimeType } from "@/app/utils/functions";

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
  playTtsAudio: (text: string) => Promise<void>;
  stopTtsAudio: () => void;
}

export const InterviewPerformContent: React.FC<
  InterviewPerformContentProps
> = ({
  organization,
  study,
  interviewSessionRefetching,
  playTtsAudio,
  stopTtsAudio,
}) => {
  const [currentQuestion, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);
  const setCurrentResponseAndUploadUrl = useSetAtom(
    currentResponseAndUploadUrlAtom,
  );
  const [_, setInterviewProgress] = useAtom(interviewProgressAtom);

  const [multipleChoiceOptionSelectionId, setMultipleChoiceOptionSelectionId] =
    useState<string | null>(null);
  const [rangeSelectionValue, setRangeSelectionValue] = useState<number | null>(
    null,
  );
  const [awaitingOptionResponse, setAwaitingOptionResponse] = useState(false);
  const [audioOn, setAudioOn] = useState(true);

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

  const handleSubmitMultipleChoiceResponse = async () => {
    if (!multipleChoiceOptionSelectionId || !currentQuestion) return;
    setAwaitingOptionResponse(true);
    stopTtsAudio();

    const nextQuestion = getNextQuestion(currentQuestion as Question);
    const wasFinalQuestion = isLastQuestion(currentQuestion as Question);

    if (wasFinalQuestion) {
      setInterviewSession((prev) => ({
        ...prev!,
        status: "COMPLETED",
      }));
      setInterviewProgress("completed");

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
    if (nextQuestion?.title && audioOn) {
      await playTtsAudio(nextQuestion.title);
    }
  };

  const handleSubmitRangeResponse = async () => {
    if (!rangeSelectionValue || !currentQuestion) return;
    setAwaitingOptionResponse(true);
    stopTtsAudio();

    const nextQuestion = getNextQuestion(currentQuestion as Question);
    const wasFinalQuestion = isLastQuestion(currentQuestion as Question);

    setCurrentQuestion(nextQuestion);

    if (wasFinalQuestion) {
      setInterviewSession((prev) => ({
        ...prev!,
        status: "COMPLETED",
      }));
      setInterviewProgress("completed");
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
    if (nextQuestion?.title && audioOn) {
      await playTtsAudio(nextQuestion.title);
    }
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
              "ngrok-skip-browser-warning": "true",
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
              contentType: getSupportedMimeType(study.videoEnabled ?? false),
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

  useEffect(() => {
    // Initialize here to warm the cache
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: study.videoEnabled ?? false })
      .catch((e) => console.log(e));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
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
        audioOn={audioOn}
        setAudioOn={setAudioOn}
      />
    </div>
  );
};
