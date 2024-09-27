"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/trpc/react";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { BasicProgressBar } from "@/app/_components/reusable/BasicProgressBar";
import QuestionSetupSection, {
  LocalQuestion,
} from "@/app/_components/org/setup/QuestionSetupSection";
import { ClipLoader } from "react-spinners";
import { Button } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react";
import {
  QuestionType,
  FollowUpLevel,
  StudyStatus,
} from "@shared/generated/client";
import { showErrorToast, showSuccessToast } from "@/app/utils/toastUtils";

export default function QuestionsPage({
  params,
}: {
  params: { studyId: string };
}) {
  const { data: study } = api.studies.getStudy.useQuery(
    {
      studyId: params.studyId,
      includeBoostedKeywords: true,
    },
    {
      refetchOnWindowFocus: false,
    },
  );
  const { data: fetchedQuestions, isLoading } =
    api.studies.getStudyQuestions.useQuery({
      studyId: params.studyId,
    });

  const updateStudyQuestionsMutation =
    api.studies.updateStudyQuestions.useMutation();

  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [questionValidations, setQuestionValidations] = useState<boolean[]>([]);

  useEffect(() => {
    if (fetchedQuestions) {
      const localQuestions: LocalQuestion[] = fetchedQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        body: q.body ?? undefined,
        questionType: q.questionType,
        followUpLevel: q.followUpLevel,
        shouldFollowUp: q.shouldFollowUp,
        hasStimulus: q.hasStimulus,
        context: q.context ?? undefined,
        questionOrder: q.questionOrder,
        allowMultipleSelections: q.allowMultipleSelections,
        lowRange: q.lowRange ?? undefined,
        highRange: q.highRange ?? undefined,
        stimulusType: q.hasStimulus
          ? q.imageStimuli.length > 0
            ? "Images"
            : q.videoStimuli.length > 0
              ? "Videos"
              : q.websiteStimuli.length > 0
                ? "Websites"
                : "None"
          : "None",
        multipleChoiceOptions:
          q.multipleChoiceOptions?.map((option) => ({
            id: option.id,
            field1: option.optionText,
            field2: undefined,
          })) ?? [],
        imageStimuli:
          q.imageStimuli?.map((stimulus) => ({
            id: stimulus.id,
            bucketUrl: stimulus.bucketUrl,
            title: stimulus.title ?? undefined,
            altText: stimulus.altText ?? undefined,
          })) ?? [],
        videoStimuli:
          q.videoStimuli?.map((stimulus) => ({
            id: stimulus.id,
            url: stimulus.url,
            type: stimulus.type,
            title: stimulus.title ?? undefined,
          })) ?? [],
        websiteStimuli:
          q.websiteStimuli?.map((stimulus) => ({
            id: stimulus.id,
            websiteUrl: stimulus.websiteUrl,
            title: stimulus.title ?? undefined,
          })) ?? [],
      }));
      setQuestions(localQuestions);
    }
  }, [fetchedQuestions]);

  console.log({ questions });

  const handleQuestionChange = useCallback(
    (index: number, updatedQuestion: LocalQuestion) => {
      setQuestions((prevQuestions) => {
        const newQuestions = [...prevQuestions];
        const questionToUpdate = { ...updatedQuestion };

        // Logic to unset other stimulus types when one is set
        if (questionToUpdate.hasStimulus) {
          if (questionToUpdate.stimulusType === "Images") {
            questionToUpdate.videoStimuli = [];
            questionToUpdate.websiteStimuli = [];
          } else if (questionToUpdate.stimulusType === "Videos") {
            questionToUpdate.imageStimuli = [];
            questionToUpdate.websiteStimuli = [];
          } else if (questionToUpdate.stimulusType === "Websites") {
            questionToUpdate.imageStimuli = [];
            questionToUpdate.videoStimuli = [];
          }
        }

        newQuestions[index] = questionToUpdate;
        return newQuestions;
      });
      setHasUnsavedChanges(true);
    },
    [],
  );

  const addNewQuestion = useCallback((index: number) => {
    const newQuestion: LocalQuestion = {
      id: `new-${Date.now()}`,
      title: "",
      body: "",
      questionType: QuestionType.OPEN_ENDED,
      followUpLevel: FollowUpLevel.SURFACE,
      shouldFollowUp: false,
      hasStimulus: false,
      context: "",
      questionOrder: index,
      allowMultipleSelections: false,
      multipleChoiceOptions: [],
      imageStimuli: [],
      videoStimuli: [],
      websiteStimuli: [],
      isNew: true,
    };
    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions.splice(index, 0, newQuestion);
      return newQuestions.map((q, i) => ({ ...q, questionOrder: i }));
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleQuestionValidationChange = useCallback(
    (isValid: boolean, index: number) => {
      setQuestionValidations((prev) => {
        const newValidations = [...prev];
        newValidations[index] = isValid;
        return newValidations;
      });
    },
    [],
  );

  const allQuestionsValid = useMemo(
    () => questionValidations.every((isValid) => isValid),
    [questionValidations],
  );

  const handleDeleteQuestion = useCallback(
    (index: number) => {
      if (
        study?.status === StudyStatus.PUBLISHED &&
        study?.completedInterviewsCount > 0
      ) {
        showErrorToast(
          "You cannot delete questions after the study has been published and responses have been collected.",
        );
        return;
      }

      setQuestions((prevQuestions) => {
        const newQuestions = prevQuestions.filter((_, i) => i !== index);
        return newQuestions.map((q, i) => ({ ...q, questionOrder: i }));
      });

      // Update questionValidations when deleting a question
      setQuestionValidations((prevValidations) => {
        const newValidations = prevValidations.filter((_, i) => i !== index);
        return newValidations;
      });

      setHasUnsavedChanges(true);
    },
    [study?.status, study?.completedInterviewsCount],
  );

  const handleSaveQuestions = useCallback(async () => {
    console.log({ questionValidations });
    if (!allQuestionsValid) {
      showErrorToast("Please fix errors in all questions before saving");
      return;
    }

    try {
      const questionsToSave = questions.map((q, index) => ({
        ...q,
        questionOrder: index,
        multipleChoiceOptions: q.multipleChoiceOptions?.map(
          (option, optionIndex) => ({
            id: option.id,
            optionText: option.field1,
            optionOrder: optionIndex,
          }),
        ),
      }));

      await updateStudyQuestionsMutation.mutateAsync({
        studyId: params.studyId,
        questions: questionsToSave,
      });
      setHasUnsavedChanges(false);
      showSuccessToast("Questions saved successfully");
    } catch (error) {
      showErrorToast("Failed to save questions");
      console.error("Failed to save questions:", error);
    }
  }, [
    questions,
    params.studyId,
    updateStudyQuestionsMutation,
    allQuestionsValid,
    questionValidations,
  ]);

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
          <React.Fragment key={question.id ?? index}>
            <QuestionSetupSection
              question={question}
              onChange={(updatedQuestion) =>
                handleQuestionChange(index, updatedQuestion)
              }
              onDelete={handleDeleteQuestion}
              onValidationChange={handleQuestionValidationChange}
              index={index}
            />
            <div className="flex w-full flex-row items-center justify-center">
              <div
                onClick={() => addNewQuestion(index + 1)}
                className="flex w-fit cursor-pointer items-center gap-2 text-sm text-theme-700"
              >
                <Plus size={20} />
                Insert Question
              </div>
            </div>
          </React.Fragment>
        ))}
        {questions.length === 0 && (
          <div className="flex w-full flex-row items-center justify-center">
            <div
              onClick={() => addNewQuestion(0)}
              className="flex w-fit cursor-pointer items-center gap-2 text-sm text-theme-700"
            >
              <Plus size={20} />
              Insert Question
            </div>
          </div>
        )}
        <Button
          onClick={handleSaveQuestions}
          className="mt-4 text-theme-off-white"
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
