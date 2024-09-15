import React, { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import SplitScreenModal from "@/app/_components/layouts/org/SplitScreenModal";
import { FollowUpQuestion, Question } from "@shared/generated/client";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import { api } from "@/trpc/react";
import QuestionModalRightContent from "./QuestionModalRightContent";
import { ExtendedStudy } from "./ResultsPageComponent";
import { formatDuration } from "@/app/utils/functions";
import QuestionModalLeftContent from "./QuestionModalLeftContent";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  interviewSessionId: string;
  study: ExtendedStudy;
  selectedResponseId: string | null;
  setSelectedResponseId: (responseId: string | null) => void;
}

type ExtendedResponse = Response & {
  question: Question | null;
  followUpQuestion: FollowUpQuestion | null;
};

const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  question,
  interviewSessionId,
  study,
  selectedResponseId,
  setSelectedResponseId,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

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

  useEffect(() => {
    if (
      isOpen &&
      responsesWithTranscripts &&
      responsesWithTranscripts.length > 0 &&
      !selectedResponseId
    ) {
      console.log("setting initial response id");
      setSelectedResponseId(responsesWithTranscripts[0]?.id ?? null);
    }
  }, [isOpen, responsesWithTranscripts, selectedResponseId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedResponseId(null);
    }
  }, [isOpen]);

  return (
    <SplitScreenModal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setSelectedResponseId(null);
      }}
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
              title: `${responsesWithTranscripts ? responsesWithTranscripts.length - 1 : "-"}`,
              subtitle: "# Follow Ups",
            },
            {
              title: totalTime,
              subtitle: "Total time",
            },
          ]}
        />
      }
      leftContent={
        <QuestionModalLeftContent
          currentResponseId={selectedResponseId}
          responses={responsesWithTranscripts ?? null}
          question={question}
          study={study}
        />
      }
      rightContent={
        <QuestionModalRightContent
          responses={responsesWithTranscripts ?? null}
          onResponseClicked={(response) => {
            setSelectedResponseId(response.id);
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set("responseId", response.id);
            router.push(`${pathname}?${newSearchParams.toString()}`);
          }}
          currentResponseId={selectedResponseId ?? ""}
        />
      }
    />
  );
};

export default QuestionModal;
