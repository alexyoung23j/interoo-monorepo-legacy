import React, { useCallback, useState, useEffect } from "react";
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
  currentResponseAtom,
  followUpQuestionsAtom,
  uploadSessionUrlAtom,
} from "@/app/state/atoms";
import { useAtom } from "jotai";
import InterviewBottomBarWithVideo from "./interviewBottomBarWithVideo";

interface InterviewPerformContentProps {
  study: Study & { questions: Question[] };
  organization: Organization;
  interviewSessionRefetching: boolean;
}

export const InterviewPerformContent: React.FC<
  InterviewPerformContentProps
> = ({ organization, study, interviewSessionRefetching }) => {
  const [currentQuestion, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);
  const [, setCurrentResponse] = useAtom(currentResponseAtom);
  const [, setUploadSessionUrl] = useAtom(uploadSessionUrlAtom);

  const [multipleChoiceOptionSelectionId, setMultipleChoiceOptionSelectionId] =
    useState<string | null>(null);
  const [rangeSelectionValue, setRangeSelectionValue] = useState<number | null>(
    null,
  );
  const [awaitingOptionResponse, setAwaitingOptionResponse] = useState(false);

  const createMultipleChoiceResponse =
    api.responses.createMultipleChoiceResponse.useMutation();

  const createRangeResponse = api.responses.createRangeResponse.useMutation();

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
      createMultipleChoiceResponse.mutate({
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

    createMultipleChoiceResponse.mutate({
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

    createRangeResponse.mutate({
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
    if (currentQuestion && interviewSession) {
      const fetchUploadUrlAndCreateResponse = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-signed-url`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                organizationId: organization.id,
                studyId: study.id,
                questionId: currentQuestion.id,
                interviewSessionId: interviewSession.id,
                fileExtension: "webm",
                contentType: study.videoEnabled ? "video/webm" : "audio/webm",
              }),
              credentials: "include",
            },
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          setUploadSessionUrl(data.sessionUrl);
          setCurrentResponse(data.newResponse);
        } catch (error) {
          console.error("Error fetching upload URL:", error);
        }
      };

      fetchUploadUrlAndCreateResponse();
    }
  }, [
    currentQuestion,
    interviewSession,
    organization.id,
    study.id,
    study.videoEnabled,
    setUploadSessionUrl,
    setCurrentResponse,
  ]);

  return (
    <>
      <DisplayQuestion
        organization={organization}
        multipleChoiceOptionSelectionId={multipleChoiceOptionSelectionId}
        setMultipleChoiceOptionSelectionId={setMultipleChoiceOptionSelectionId}
        rangeSelectionValue={rangeSelectionValue}
        setRangeSelectionValue={setRangeSelectionValue}
      />
      <InterviewBottomBarWithVideo
        organization={organization}
        study={study}
        multipleChoiceOptionSelectionId={multipleChoiceOptionSelectionId}
        rangeSelectionValue={rangeSelectionValue}
        handleSubmitMultipleChoiceResponse={handleSubmitMultipleChoiceResponse}
        awaitingOptionResponse={awaitingOptionResponse}
        interviewSessionRefetching={interviewSessionRefetching}
        handleSubmitRangeResponse={handleSubmitRangeResponse}
      />
    </>
  );
};
