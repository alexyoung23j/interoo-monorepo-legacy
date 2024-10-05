import React from "react";
import {
  Attribute,
  FollowUpQuestion,
  Question,
  Quote,
  QuotesOnAttribute,
  QuotesOnTheme,
  Response,
  Theme,
} from "@shared/generated/client";
import { ClipLoader } from "react-spinners";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { CopySimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/app/utils/functions";
import BasicTag from "@/app/_components/reusable/BasicTag";
import { showSuccessToast } from "@/app/utils/toastUtils";
import { ExtendedResponse, FullTranscriptBlob } from "@shared/types";
import { ResponseModalCard } from "@/app/_components/reusable/ResponseModalCard";

interface QuestionModalRightContentProps {
  responses: ExtendedResponse[] | null;
  onResponseClicked: (response: Response) => void;
  currentResponseId: string;
  refetchResponses: () => void;
}

const QuestionModalRightContent: React.FC<QuestionModalRightContentProps> = ({
  responses,
  onResponseClicked,
  currentResponseId,
  refetchResponses,
}) => {
  if (!responses) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ClipLoader color="grey" />
      </div>
    );
  }

  const copyThread = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!responses) return;

    const formattedThread = responses
      .map((response) => {
        const questionTitle = !response.followUpQuestion
          ? response.question?.title
          : response.followUpQuestion?.title;
        const questionType = response.followUpQuestion
          ? "Follow Up"
          : "Original Question";

        return `${questionType}: "${questionTitle}"\nAnswer: "${response.fastTranscribedText}"\n`;
      })
      .join("\n");

    navigator.clipboard
      .writeText(formattedThread)
      .then(() => {
        console.log("Thread copied to clipboard");
        showSuccessToast("Thread copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy thread: ", err);
      });
  };

  const copyIndividualResponse = (
    response: Response & {
      question: Question | null;
      followUpQuestion: FollowUpQuestion | null;
    },
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    const questionTitle = !response.followUpQuestion
      ? response.question?.title
      : response.followUpQuestion?.title;
    const questionType = response.followUpQuestion
      ? "Follow Up"
      : "Original Question";

    const formattedResponse = `${questionType}: "${questionTitle}"\nAnswer: "${response.fastTranscribedText}"`;

    navigator.clipboard
      .writeText(formattedResponse)
      .then(() => {
        showSuccessToast("Response copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy response: ", err);
      });
  };

  return (
    <div className="flex h-fit w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="text-lg font-semibold">
          {`Transcript${responses.length > 1 ? "s" : ""}`}
        </div>
        <Button
          className="flex items-center gap-1"
          variant="secondary"
          size="sm"
          onClick={copyThread}
        >
          {`Copy${responses.length > 1 ? " Thread" : ""}`}{" "}
          <CopySimple size={16} className="text-theme-900" />
        </Button>
      </div>
      <div className="h-[1px] w-full bg-theme-200 text-theme-900"></div>

      <div className="flex w-full flex-col gap-3">
        {responses.map((response) => (
          <ResponseModalCard
            key={response.id}
            response={response}
            currentResponseId={currentResponseId}
            onResponseClicked={onResponseClicked}
            copyIndividualResponse={copyIndividualResponse}
            refetchResponses={refetchResponses}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionModalRightContent;
