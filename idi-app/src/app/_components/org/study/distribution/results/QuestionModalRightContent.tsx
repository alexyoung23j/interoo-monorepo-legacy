import React from "react";
import { FollowUpQuestion, Question, Response } from "@shared/generated/client";
import { ClipLoader } from "react-spinners";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { CopySimple } from "@phosphor-icons/react";
import { Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/app/utils/functions";
import BasicTag from "@/app/_components/reusable/BasicTag";
import { showSuccessToast } from "@/app/utils/toastUtils";

interface QuestionModalRightContentProps {
  responses:
    | (Response & {
        question: Question | null;
        followUpQuestion: FollowUpQuestion | null;
      })[]
    | null;
  onResponseClicked: (response: Response) => void;
}

const QuestionModalRightContent: React.FC<QuestionModalRightContentProps> = ({
  responses,
  onResponseClicked,
}) => {
  if (!responses) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ClipLoader color="grey" />
      </div>
    );
  }

  const copyThread = () => {
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
  ) => {
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
          <BasicCard
            className="flex cursor-pointer flex-col gap-2 shadow-standard"
            shouldHover
            key={response.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-grow font-semibold text-theme-900">
                {!response.followUpQuestion
                  ? response.question?.title
                  : response.followUpQuestion?.title}
              </div>
              <CopySimple
                size={16}
                className="flex-shrink-0 text-theme-900"
                onClick={() => copyIndividualResponse(response)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-theme-500">
              {response.followUpQuestion && (
                <BasicTag className="py-0.5 text-xs">Follow Up</BasicTag>
              )}
              <span className="italic">
                {formatDuration(
                  new Date(response.createdAt),
                  new Date(response.updatedAt),
                )}
              </span>
            </div>

            <div className="text-theme-600">
              {`"${response.fastTranscribedText}"`}
            </div>
          </BasicCard>
        ))}
      </div>
    </div>
  );
};

export default QuestionModalRightContent;
