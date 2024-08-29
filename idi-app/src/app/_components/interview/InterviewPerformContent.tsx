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

interface InterviewPerformContentProps {
  calculatedCurrentQuestion: Question;
  interviewSession: InterviewSession & {
    responses: Response[];
    FollowUpQuestions: FollowUpQuestion[];
  };
  study: Study & { questions: Question[] };
  organization: Organization;
  refetchInterviewSession: () => void;
  interviewSessionRefetching: boolean;
}

export const InterviewPerformContent: React.FC<
  InterviewPerformContentProps
> = ({
  calculatedCurrentQuestion,
  interviewSession,
  organization,
  study,
  refetchInterviewSession,
  interviewSessionRefetching,
}) => {
  const [multipleChoiceOptionSelectionId, setMultipleChoiceOptionSelectionId] =
    useState<string | null>(null);
  const [rangeSelectionValue, setRangeSelectionValue] = useState<number | null>(
    null,
  );
  const [awaitingOptionResponse, setAwaitingOptionResponse] = useState(false);

  const createMultipleChoiceResponse =
    api.responses.createMultipleChoiceResponse.useMutation();

  const handleSubmitMultipleChoiceResponse = async () => {
    if (!multipleChoiceOptionSelectionId) return;
    setAwaitingOptionResponse(true);

    await createMultipleChoiceResponse.mutateAsync({
      multipleChoiceOptionSelectionId: multipleChoiceOptionSelectionId,
      interviewSessionId: interviewSession.id,
      studyId: study.id,
      currentQuestionOrder: calculatedCurrentQuestion.questionOrder,
      questionId: calculatedCurrentQuestion.id,
    });
    setMultipleChoiceOptionSelectionId(null);
    refetchInterviewSession();
    setAwaitingOptionResponse(false);
  };

  return (
    <>
      <DisplayQuestion
        question={calculatedCurrentQuestion}
        interviewSession={interviewSession}
        organization={organization}
        multipleChoiceOptionSelectionId={multipleChoiceOptionSelectionId}
        setMultipleChoiceOptionSelectionId={setMultipleChoiceOptionSelectionId}
        rangeSelectionValue={rangeSelectionValue}
        setRangeSelectionValue={setRangeSelectionValue}
      />
      <InterviewBottomBar
        organization={organization}
        question={calculatedCurrentQuestion}
        interviewSession={interviewSession}
        study={study}
        refetchInterviewSession={refetchInterviewSession}
        multipleChoiceOptionSelectionId={multipleChoiceOptionSelectionId}
        rangeSelectionValue={rangeSelectionValue}
        handleSubmitMultipleChoiceResponse={handleSubmitMultipleChoiceResponse}
        awaitingOptionResponse={awaitingOptionResponse}
        interviewSessionRefetching={interviewSessionRefetching}
      />
    </>
  );
};
