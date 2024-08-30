import React, { useState } from "react";
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

  const [multipleChoiceOptionSelectionId, setMultipleChoiceOptionSelectionId] =
    useState<string | null>(null);
  const [rangeSelectionValue, setRangeSelectionValue] = useState<number | null>(
    null,
  );
  const [awaitingOptionResponse, setAwaitingOptionResponse] = useState(false);

  const createMultipleChoiceResponse =
    api.responses.createMultipleChoiceResponse.useMutation();

  const createRangeResponse = api.responses.createRangeResponse.useMutation();

  const handleSubmitMultipleChoiceResponse = async () => {
    if (!multipleChoiceOptionSelectionId) return;
    setAwaitingOptionResponse(true);

    await createMultipleChoiceResponse.mutateAsync({
      multipleChoiceOptionSelectionId: multipleChoiceOptionSelectionId,
      interviewSessionId: interviewSession?.id ?? "",
      studyId: study.id,
      currentQuestionOrder: (currentQuestion as Question).questionOrder,
      questionId: (currentQuestion as Question).id,
    });
    setAwaitingOptionResponse(false);
    setMultipleChoiceOptionSelectionId(null);
  };

  const handleSubmitRangeResponse = async () => {
    if (!rangeSelectionValue) return;
    setAwaitingOptionResponse(true);

    await createRangeResponse.mutateAsync({
      rangeSelection: rangeSelectionValue,
      interviewSessionId: interviewSession?.id ?? "",
      studyId: study.id,
      currentQuestionOrder: (currentQuestion as Question).questionOrder,
      questionId: (currentQuestion as Question).id,
    });
    refetchInterviewSession();
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
