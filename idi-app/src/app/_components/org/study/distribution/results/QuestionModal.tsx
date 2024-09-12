import React from "react";
import { X } from "@phosphor-icons/react";
import SplitScreenModal from "@/app/_components/layouts/org/SplitScreenModal";
import { Question } from "@shared/generated/client";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import { api } from "@/trpc/react";
import QuestionModalRightContent from "./QuestionModalRightContent";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  interviewSessionId: string;
}

const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  question,
  interviewSessionId,
}) => {
  const { data: responsesData, isLoading } =
    api.questions.getResponses.useQuery({
      questionId: question?.id ?? "",
      includeQuestions: true,
      interviewSessionId: interviewSessionId,
    });

  const responsesWithTranscripts = responsesData
    ?.filter((response) => response.fastTranscribedText !== "")
    .sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  console.log({ responsesWithTranscripts });

  const topContent = (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="text-lg font-semibold text-theme-900">
        {question?.title}
      </div>
    </div>
  );

  const leftContent = <div>left</div>;
  const rightContent = <div>right</div>;

  return (
    <SplitScreenModal
      isOpen={isOpen}
      onClose={onClose}
      topContent={
        <BasicHeaderCard
          items={[
            {
              title: "Test",
              subtitle: "Completed Interviews",
            },
            {
              title: "Test",
              subtitle: "Incomplete Interviews",
            },
            {
              title: "todo",
              subtitle: "Average Completion Time",
            },
          ]}
        />
      }
      leftContent={leftContent}
      rightContent={
        <QuestionModalRightContent
          responses={responsesWithTranscripts ?? null}
          onResponseClicked={() => {
            console.log("clicked");
          }}
        />
      }
    />
  );
};

export default QuestionModal;
