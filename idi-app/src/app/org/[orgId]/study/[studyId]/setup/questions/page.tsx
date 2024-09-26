"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { BasicProgressBar } from "@/app/_components/reusable/BasicProgressBar";
import QuestionSetupSection, {
  LocalQuestion,
} from "@/app/_components/org/setup/QuestionSetupSection";
import { ClipLoader } from "react-spinners";
import { Button } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react";
import { QuestionType, FollowUpLevel } from "@shared/generated/client";
import { showErrorToast, showSuccessToast } from "@/app/utils/toastUtils";

export default function QuestionsPage({
  params,
}: {
  params: { studyId: string };
}) {
  const { data: fetchedQuestions, isLoading } =
    api.studies.getStudyQuestions.useQuery({
      studyId: params.studyId,
    });

  const updateStudyQuestionsMutation =
    api.studies.updateStudyQuestions.useMutation();

  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (fetchedQuestions) {
      const localQuestions: LocalQuestion[] = fetchedQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        body: q.body ?? undefined,
        questionType: q.questionType,
        followUpLevel: q.followUpLevel,
        shouldFollowUp: q.shouldFollowUp,
        context: q.context ?? undefined,
        questionOrder: q.questionOrder,
        hasStimulus: q.hasStimulus,
        allowMultipleSelections: q.allowMultipleSelections,
        lowRange: q.lowRange ?? undefined,
        highRange: q.highRange ?? undefined,
        multipleChoiceOptions:
          q.multipleChoiceOptions.map((option) => ({
            id: option.id,
            field1: option.optionText,
            field2: undefined,
          })) ?? [],
      }));
      setQuestions(localQuestions);
    }
  }, [fetchedQuestions]);

  const handleQuestionChange = useCallback(
    (index: number, updatedQuestion: LocalQuestion) => {
      setQuestions((prevQuestions) => {
        const newQuestions = [...prevQuestions];
        newQuestions[index] = updatedQuestion;
        return newQuestions;
      });
      setHasUnsavedChanges(true);
    },
    [],
  );

  const addNewQuestion = useCallback(() => {
    const newQuestion: LocalQuestion = {
      id: `new-${Date.now()}`,
      title: "",
      body: "",
      questionType: QuestionType.OPEN_ENDED,
      followUpLevel: FollowUpLevel.AUTOMATIC,
      shouldFollowUp: true,
      context: "",
      questionOrder: questions.length,
      hasStimulus: false,
      allowMultipleSelections: false,
      multipleChoiceOptions: [],
      isNew: true,
    };
    setQuestions((prev) => [...prev, newQuestion]);
    setHasUnsavedChanges(true);
  }, [questions]);

  const handleSaveQuestions = useCallback(async () => {
    try {
      await updateStudyQuestionsMutation.mutateAsync({
        studyId: params.studyId,
        questions: questions.map((q) => ({
          ...q,
          multipleChoiceOptions: q.multipleChoiceOptions?.map((option) => ({
            id: option.id,
            optionText: option.field1,
            optionOrder: 0, // You might want to add proper ordering logic
          })),
        })),
      });
      setHasUnsavedChanges(false);
      showSuccessToast("Questions saved successfully");
    } catch (error) {
      showErrorToast("Failed to save questions");
      console.error("Failed to save questions:", error);
    }
  }, [questions, params.studyId, updateStudyQuestionsMutation]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-theme-off-white">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-10 overflow-y-auto bg-theme-off-white p-9">
      <div className="flex flex-col gap-2">
        <div className="flex w-full flex-row items-center justify-between">
          <div className="text-lg font-medium text-theme-900">Study Setup</div>
          <div className="text-sm text-theme-600">75% complete</div>
        </div>
        <div className="text-sm text-theme-600">
          Create your study and get started distributing!
        </div>
      </div>
      <BasicProgressBar value={75} />
      <BasicCard className="flex flex-col gap-6 p-6 shadow-standard">
        <div className="flex w-full flex-row items-center justify-between">
          <div className="text-lg text-theme-600">Questions</div>
          <div className="text-xs">
            {hasUnsavedChanges ? (
              <span className="font-semibold text-theme-700">Unsaved</span>
            ) : (
              <span className="text-theme-500">Saved</span>
            )}
          </div>
        </div>
        {questions.map((question, index) => (
          <QuestionSetupSection
            key={question.id ?? index}
            question={question}
            onChange={(updatedQuestion) =>
              handleQuestionChange(index, updatedQuestion)
            }
            onValidationChange={() => {
              // Implement validation logic if needed
            }}
          />
        ))}
        <Button
          onClick={addNewQuestion}
          variant="unstyled"
          className="mt-4 flex items-center gap-2"
        >
          <Plus size={20} />
          Add New Question
        </Button>
        <Button
          onClick={handleSaveQuestions}
          className="mt-4"
          disabled={
            !hasUnsavedChanges || updateStudyQuestionsMutation.isPending
          }
        >
          {updateStudyQuestionsMutation.isPending
            ? "Saving..."
            : "Save Questions"}
        </Button>
      </BasicCard>
    </div>
  );
}
