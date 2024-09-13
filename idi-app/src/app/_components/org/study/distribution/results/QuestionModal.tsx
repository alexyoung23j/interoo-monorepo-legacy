import React from "react";
import { X } from "@phosphor-icons/react";
import SplitScreenModal from "@/app/_components/layouts/org/SplitScreenModal";
import { Question } from "@shared/generated/client";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import { api } from "@/trpc/react";
import QuestionModalRightContent from "./QuestionModalRightContent";
import { ExtendedStudy } from "./ResultsPageComponent";
import { formatDuration } from "@/app/utils/functions";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  interviewSessionId: string;
  study: ExtendedStudy;
}

const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  question,
  interviewSessionId,
  study,
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

  const totalTime =
    responsesWithTranscripts && responsesWithTranscripts.length > 0
      ? formatDuration(
          new Date(responsesWithTranscripts[0]?.createdAt ?? ""),
          new Date(
            responsesWithTranscripts[responsesWithTranscripts.length - 1]
              ?.updatedAt ?? "",
          ),
        )
      : "0:00";

  const topContent = (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="text-lg font-semibold text-theme-900">
        {question?.title}
      </div>
    </div>
  );

  const leftContent = <div>left</div>;

  return (
    <SplitScreenModal
      isOpen={isOpen}
      onClose={onClose}
      topContent={
        <BasicHeaderCard
          items={[
            {
              title: study.title,
              subtitle: "Study",
            },
            {
              title: `#${question?.questionOrder + 1}`,
              subtitle: "Question number",
            },
            {
              title: `${(responsesWithTranscripts?.length ?? 0) - 1}`,
              subtitle: "# Follow Ups",
            },
            {
              title: totalTime,
              subtitle: "Total time",
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
