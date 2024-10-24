"use client";

import React, { useEffect, useState } from "react";
import {
  Question,
  Study,
  Response,
  InterviewSession,
  Theme,
  ThemesOnQuestion,
} from "@shared/generated/client";
import SplitScreenLayout from "@/app/_components/layouts/org/SplitScreenLayout";
import BasicCard from "@/app/_components/reusable/BasicCard";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import ResultsQuestionCard from "./ResultsQuestionCard";
import { Button } from "@/components/ui/button";
import { ArrowSquareOut, X } from "@phosphor-icons/react";
import ResponsesPreview from "./ResponsesPreviewComponent";
import QuestionModal from "./QuestionModal";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useExportData } from "@/hooks/useExportData";
import { ClipLoader } from "react-spinners";
import { showErrorToast } from "@/app/utils/toastUtils";
import { api } from "@/trpc/react";
import { useThemes } from "@/hooks/useThemes";

interface ExtendedTheme extends Theme {
  quoteCount: number;
}

export type ExtendedStudy = Study & {
  completedInterviewsCount: number;
  inProgressInterviewsCount: number;
  questions: (Question & {
    _count?: { Response: number };
    ThemesOnQuestion: (ThemesOnQuestion & {
      theme: Theme;
    })[];
  })[];
};

interface ResultsPageComponentProps {
  studyId: string;
}

const ResultsPageComponent: React.FC<ResultsPageComponentProps> = ({
  studyId,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data: study, isLoading } = api.studies.getStudy.useQuery(
    {
      studyId: studyId,
      includeQuestions: true,
    },
    {
      refetchOnWindowFocus: false,
    },
  ) as { data: ExtendedStudy; isLoading: boolean };

  const { data: themes, isLoading: isLoadingThemes } = useThemes(studyId);

  const { handleExport, isExporting } = useExportData({
    studyId: study?.id,
  });

  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const [selectedInterviewSessionId, setSelectedInterviewSessionId] = useState<
    string | null
  >(null);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(
    null,
  );
  const [questionModalOpen, setQuestionModalOpen] = useState(false);

  useEffect(() => {
    const questionId = searchParams.get("questionId");
    const interviewSessionId = searchParams.get("interviewSessionId");
    const modalOpen = searchParams.get("modalOpen");
    const responseId = searchParams.get("responseId");

    if (questionId) {
      const question =
        study?.questions.find((q) => q.id === questionId) ?? null;
      setSelectedQuestion(question);
    }

    if (interviewSessionId) {
      setSelectedInterviewSessionId(interviewSessionId);
    }

    if (responseId) {
      setSelectedResponseId(responseId);
    }

    if (modalOpen === "true") {
      setQuestionModalOpen(true);
    }
  }, [searchParams, study?.questions]);

  const handleViewResponses = (question: Question) => {
    if (selectedQuestion?.id === question.id) {
      setSelectedQuestion(null);
      router.push(pathname);
    } else {
      setSelectedQuestion(question);
      router.push(`${pathname}?questionId=${question.id}`);
    }
  };

  const handleThemeClick = (themeId: string) => {
    router.push(
      `/org/${study.organizationId}/study/${studyId}/analysis/themes?selectedTheme=${themeId}`,
    );
  };

  if (isLoading || isLoadingThemes || !study) {
    return (
      <div className="flex h-full items-center justify-center bg-theme-off-white">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );
  }

  return (
    <>
      <QuestionModal
        isOpen={
          questionModalOpen &&
          selectedInterviewSessionId !== null &&
          selectedQuestion !== null
        }
        onClose={() => {
          setQuestionModalOpen(false);
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete("modalOpen");
          newSearchParams.set("questionId", selectedQuestion!.id);
          router.push(`${pathname}?${newSearchParams.toString()}`);
        }}
        question={selectedQuestion!}
        interviewSessionId={selectedInterviewSessionId ?? ""}
        study={study}
        selectedResponseId={selectedResponseId}
        setSelectedResponseId={setSelectedResponseId}
      />
      <SplitScreenLayout
        mainContent={
          <div className="flex flex-col gap-4">
            <div className="flex w-full flex-row items-center justify-between">
              <div className="text-lg font-medium text-theme-900">
                Study Statistics
              </div>
              <Button
                variant="secondary"
                className="flex flex-row gap-2"
                onClick={() => {
                  handleExport(
                    `${study.title}-data-export-${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, "-")}`,
                  ).catch((error) => {
                    console.error("Error exporting data", error);
                    showErrorToast("Error exporting data");
                  });
                }}
              >
                {isExporting ? (
                  <ClipLoader size={16} color="grey" />
                ) : (
                  <ArrowSquareOut size={16} className="text-theme-900" />
                )}
                Export Data
              </Button>
            </div>
            <BasicHeaderCard
              items={[
                {
                  title: study.completedInterviewsCount.toString(),
                  subtitle: "Completed Interviews",
                },
                {
                  title: study.inProgressInterviewsCount.toString(),
                  subtitle: "Incomplete Interviews",
                },
                {
                  title: study.questions.length.toString(),
                  subtitle: "# Questions",
                },
              ]}
            />
            <div className="mt-8 text-lg font-medium text-theme-900">
              Interview Results
            </div>
            {study.questions
              ?.sort((a, b) => a.questionOrder - b.questionOrder)
              .map((question, index) => (
                <ResultsQuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  onViewResponses={() => {
                    handleViewResponses(question);
                  }}
                  isSelected={selectedQuestion?.id === question.id}
                  orgId={study.organizationId}
                  onThemeClick={handleThemeClick}
                  themes={(themes ?? []) as ExtendedTheme[]}
                />
              ))}
          </div>
        }
        showRightContent={selectedQuestion !== null}
        rightContent={
          <div className="flex w-full flex-col gap-4 text-theme-900">
            <div className="flex w-full items-start justify-between gap-3">
              <div className="text-lg font-semibold">
                {selectedQuestion?.title}
              </div>
              <div
                className="cursor-pointer"
                onClick={() => {
                  setSelectedQuestion(null);
                  router.push(pathname);
                }}
              >
                <X size={24} className="text-theme-900" />
              </div>
            </div>
            <div className="h-[1px] w-full bg-theme-200" />
            <ResponsesPreview
              question={selectedQuestion}
              onResponseClick={(response) => {
                console.log("response clicked", response);
                setQuestionModalOpen(true);
                setSelectedInterviewSessionId(
                  response?.interviewSessionId ?? null,
                );
                router.push(
                  `${pathname}?questionId=${selectedQuestion?.id}&interviewSessionId=${response?.interviewSessionId}&responseId=${response?.id}&modalOpen=true`,
                );
              }}
            />
          </div>
        }
      />
    </>
  );
};

export default ResultsPageComponent;
