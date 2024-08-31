import React, { useCallback, useState } from "react";
import { DisplayQuestion } from "./DisplayQuestion";
import InterviewBottomBar from "./InterviewBottomBar";
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
} from "@/app/state/atoms";
import { useAtom } from "jotai";

interface InterviewPerformContentProps {
  study: Study & { questions: Question[] };
  organization: Organization;
  refetchInterviewSession: () => void;
  interviewSessionRefetching: boolean;
}

export const InterviewPerformContent: React.FC<
  InterviewPerformContentProps
> = ({
  organization,
  study,
  refetchInterviewSession,
  interviewSessionRefetching,
}) => {
  const [currentQuestion, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [interviewSession, setInterviewSession] = useAtom(interviewSessionAtom);
  const [responses, setResponses] = useAtom(responsesAtom);
  const [currentResponse, setCurrentResponse] = useAtom(currentResponseAtom);
  const [followUpQuestions, setFollowUpQuestions] = useAtom(
    followUpQuestionsAtom,
  );

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
      const nextOrder = currentQuestion.questionOrder + 1;
      return study.questions.find((q) => q.questionOrder === nextOrder) || null;
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

  return (
    <>
      <DisplayQuestion
        organization={organization}
        multipleChoiceOptionSelectionId={multipleChoiceOptionSelectionId}
        setMultipleChoiceOptionSelectionId={setMultipleChoiceOptionSelectionId}
        rangeSelectionValue={rangeSelectionValue}
        setRangeSelectionValue={setRangeSelectionValue}
      />
      <InterviewBottomBar
        organization={organization}
        study={study}
        refetchInterviewSession={refetchInterviewSession}
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
