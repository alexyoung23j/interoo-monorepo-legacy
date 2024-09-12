import BasicCard from "@/app/_components/reusable/BasicCard";
import { api } from "@/trpc/react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { Question, QuestionType } from "@shared/generated/client";
import React, { useMemo } from "react";
import { ClipLoader } from "react-spinners";

interface ResponsesPreviewProps {
  question: Question | null;
}

interface ProcessedResponse {
  id: string;
  interviewSessionId: string;
  fastTranscribedText: string;
  numFollowUps: number;
  multipleChoiceOptionId: string | null;
  rangeSelection: number | null;
}

const ResponsesPreview: React.FC<ResponsesPreviewProps> = ({ question }) => {
  const { data: responsesData, isLoading } =
    api.questions.getResponses.useQuery({
      questionId: question?.id ?? "",
    });

  console.log({ responsesData });

  const filteredResponsesData =
    question?.questionType === QuestionType.OPEN_ENDED
      ? responsesData?.filter((response) => response.fastTranscribedText != "")
      : responsesData;

  const processedResponses = useMemo(() => {
    if (!filteredResponsesData) return [];

    // Step 1: Find all responses without follow-ups
    const mainResponses = filteredResponsesData.filter(
      (response) => !response.followUpQuestionId,
    );

    // Step 2: Create a map of these responses
    const responseMap = new Map<string, ProcessedResponse>(
      mainResponses.map((response) => [
        response.interviewSessionId,
        {
          id: response.id,
          interviewSessionId: response.interviewSessionId,
          fastTranscribedText: response.fastTranscribedText,
          numFollowUps: 0,
          multipleChoiceOptionId: response.multipleChoiceOptionId,
          rangeSelection: response.rangeSelection,
        },
      ]),
    );

    // Step 3: Count follow-ups
    filteredResponsesData.forEach((response) => {
      if (response.followUpQuestionId) {
        const mainResponse = responseMap.get(response.interviewSessionId);

        if (mainResponse) {
          mainResponse.numFollowUps++;
        }
      }
    });

    return Array.from(responseMap.values());
  }, [filteredResponsesData]);
  if (isLoading)
    return (
      <div className="mt-10 flex h-full w-full justify-center">
        <ClipLoader size={48} color={"grey"} />
      </div>
    );

  const renderResponsesPreview = (
    processedResponse: ProcessedResponse,
    questionType: QuestionType,
    index: number,
    key: string,
  ) => {
    switch (questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return <div></div>;
      case QuestionType.RANGE:
        return <div></div>;
      default:
        return (
          <BasicCard
            className="flex cursor-pointer flex-col gap-1 shadow-standard"
            key={key}
          >
            <div className="flex justify-between">
              <div className="text-sm text-theme-900">Response {index + 1}</div>
              <ArrowSquareOut size={16} className="text-theme-900" />
            </div>
            <div className="text-xs text-theme-300">
              {processedResponse.numFollowUps} Follow Ups
            </div>
            <div className="text-xs text-theme-900">
              {`"${processedResponse.fastTranscribedText}"`}
            </div>
          </BasicCard>
        );
    }
  };

  return (
    <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin">
      {processedResponses.map((processedResponse, index) =>
        renderResponsesPreview(
          processedResponse,
          question?.questionType ?? QuestionType.OPEN_ENDED,
          index,
          processedResponse.id,
        ),
      )}
    </div>
  );
};

export default ResponsesPreview;
