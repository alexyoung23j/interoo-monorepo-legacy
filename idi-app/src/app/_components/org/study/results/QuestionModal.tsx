import React, { useEffect, useState } from "react";
import { ArrowSquareOut, X } from "@phosphor-icons/react";
import SplitScreenModal from "@/app/_components/layouts/org/SplitScreenModal";
import type {
  Attribute,
  FollowUpQuestion,
  Question,
  Quote,
  QuotesOnAttribute,
  QuotesOnTheme,
  Theme,
  Response,
} from "@shared/generated/client";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import { api } from "@/trpc/react";
import QuestionModalRightContent from "./QuestionModalRightContent";
import { ExtendedStudy } from "./ResultsPageComponent";
import { formatDuration } from "@/app/utils/functions";
import QuestionModalLeftContent from "./QuestionModalLeftContent";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExtendedResponse } from "@shared/types";
import { Button } from "@/components/ui/button";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  interviewSessionId: string;
  study: ExtendedStudy;
  selectedResponseId: string | null;
  setSelectedResponseId: (responseId: string | null) => void;
}

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

  const { data: responsesData, refetch: refetchResponses } =
    api.questions.getResponses.useQuery({
      questionId: question?.id ?? "",
      includeQuestions: true,
      includeQuotes: true,
      includeParticipantDemographics: false,
      interviewSessionId: interviewSessionId,
      includeFavorites: true,
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
              title: totalTime,
              subtitle: "Total time",
            },
            {
              title: "",
              subtitle: "",
              childNode: (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    router.push(
                      `/org/${study.organizationId}/study/${study.id}/interviews?interviewSessionId=${interviewSessionId}&modalOpen=true`,
                    );
                  }}
                >
                  See Interview
                  <ArrowSquareOut size={16} />
                </Button>
              ),
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
          interviewSessionId={interviewSessionId}
        />
      }
      rightContent={
        <QuestionModalRightContent
          responses={responsesWithTranscripts as ExtendedResponse[]}
          onResponseClicked={(response) => {
            setSelectedResponseId(response.id);
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set("responseId", response.id);
            router.push(`${pathname}?${newSearchParams.toString()}`);
          }}
          currentResponseId={selectedResponseId ?? ""}
          refetchResponses={refetchResponses}
        />
      }
    />
  );
};

export default QuestionModal;
