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
import { DotsThree, Plus, Trash } from "@phosphor-icons/react";
import {
  QuestionType,
  FollowUpLevel,
  StudyStatus,
} from "@shared/generated/client";
import { showErrorToast, showSuccessToast } from "@/app/utils/toastUtils";
import BasicConfirmationModal from "@/app/_components/reusable/BasicConfirmationModal";
import BasicTag from "@/app/_components/reusable/BasicTag";
import { useRouter } from "next/navigation";
import BasicPopover from "@/app/_components/reusable/BasicPopover";

export default function QuestionsPage({
  params,
}: {
  params: { studyId: string };
}) {
  const router = useRouter();
  const { data: study, refetch: refetchStudy } = api.studies.getStudy.useQuery(
    {
      studyId: params.studyId,
      includeBoostedKeywords: true,
    },
    {
      refetchOnWindowFocus: false,
    },
  );
  const {
    data: fetchedQuestions,
    isLoading,
    refetch: refetchQuestions,
  } = api.studies.getStudyQuestions.useQuery(
    {
      studyId: params.studyId,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  const updateStudyQuestionsMutation =
    api.studies.updateStudyQuestions.useMutation({
      onSuccess: () => {
        void refetchQuestions();
      },
    });
  const updateStudyMutation = api.studies.updateStudy.useMutation();
  const deleteStudyMutation = api.studies.deleteStudy.useMutation();

  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [questionValidations, setQuestionValidations] = useState<boolean[]>([]);
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    if (fetchedQuestions && fetchedQuestions.length > 0) {
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
    } else {
      // Create a default question if there are no fetched questions
      const defaultQuestion: LocalQuestion = {
        id: `new-${Date.now()}`,
        title: "",
        body: "",
        questionType: QuestionType.OPEN_ENDED,
        followUpLevel: FollowUpLevel.SURFACE,
        shouldFollowUp: false,
        hasStimulus: false,
        context: "",
        questionOrder: 0,
        allowMultipleSelections: false,
        multipleChoiceOptions: [],
        imageStimuli: [],
        videoStimuli: [],
        websiteStimuli: [],
        isNew: true,
      };
      setQuestions([defaultQuestion]);
    }
  }, [fetchedQuestions]);

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
      if (study?.status === StudyStatus.PUBLISHED) {
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
    [study?.status],
  );

  const handleSaveQuestions = useCallback(async () => {
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
      <BasicConfirmationModal
        isOpen={showPublishConfirmation}
        onOpenChange={setShowPublishConfirmation}
        title="Save and publish this study?"
        subtitle="This allows you to start distributing your study. Note that after publishing, you cannot delete questions as this would result in corrupted response data."
        confirmButtonText="Save and Publish"
        cancelButtonText="Save draft"
        body={
          <div>
            {(updateStudyQuestionsMutation.isPending ||
              updateStudyMutation.isPending) && (
              <div className="flex items-center justify-center py-4">
                <ClipLoader size={20} color="grey" />
              </div>
            )}
          </div>
        }
        onCancel={async () => {
          try {
            await handleSaveQuestions();
            setShowPublishConfirmation(false);
            showSuccessToast("Draft saved successfully");
          } catch (error) {
            showErrorToast("Failed to save study");
            console.error("Failed to save study:", error);
          }
        }}
        onConfirm={async () => {
          try {
            await handleSaveQuestions();
            await updateStudyMutation.mutateAsync({
              id: params.studyId,
              status: StudyStatus.PUBLISHED,
            });
            showSuccessToast("Study published successfully");
            router.push(
              `/org/${study?.organizationId}/study/${study?.id}/distribution`,
            );
          } catch (error) {
            showErrorToast("Failed to publish study");
            console.error("Failed to publish study:", error);
          }
        }}
      />
      <BasicConfirmationModal
        isOpen={showUpdateConfirmation}
        onOpenChange={setShowUpdateConfirmation}
        title="Update this published study?"
        subtitle="Note that this may result in inconsistent responses across recorded interviews if you have already distributed your study."
        confirmButtonText="Update"
        cancelButtonText="Cancel"
        body={
          <div>
            {(updateStudyQuestionsMutation.isPending ||
              updateStudyMutation.isPending) && (
              <div className="flex items-center justify-center py-4">
                <ClipLoader size={20} color="grey" />
              </div>
            )}
          </div>
        }
        onCancel={async () => {
          setShowUpdateConfirmation(false);
        }}
        onConfirm={async () => {
          try {
            await handleSaveQuestions();
            showSuccessToast("Study updated successfully");
            router.push(
              `/org/${study?.organizationId}/study/${study?.id}/results`,
            );
          } catch (error) {
            showErrorToast("Failed to update study");
            console.error("Failed to update study:", error);
          }
        }}
      />
      <BasicConfirmationModal
        isOpen={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
        title="Delete this draft?"
        subtitle="This action cannot be undone."
        confirmButtonText="Delete Draft"
        confirmButtonColor="!bg-red-500"
        cancelButtonText="Cancel"
        body={
          <div>
            {deleteStudyMutation.isPending && (
              <div className="flex items-center justify-center py-4">
                <ClipLoader size={20} color="grey" />
              </div>
            )}
          </div>
        }
        onCancel={() => {
          setShowDeleteConfirmation(false);
        }}
        onConfirm={async () => {
          try {
            await deleteStudyMutation.mutateAsync({
              studyId: params.studyId,
            });
            router.push(`/org/${study?.organizationId}/studies`);
          } catch (error) {
            showErrorToast("Failed to delete draft");
            console.error("Failed to delete draft:", error);
          }
        }}
      />
      <div className="flex flex-col gap-2">
        <div className="flex w-full flex-row items-center justify-between">
          <div className="text-lg font-medium text-theme-900">Study Setup</div>
          <div className="flex items-center gap-2 text-sm text-theme-600">
            {study?.status === StudyStatus.DRAFT ? (
              <BasicTag>Draft</BasicTag>
            ) : (
              <BasicTag color="bg-[#CEDBD3]" borderColor="border-[#427356]">
                Published
              </BasicTag>
            )}
            {study?.status === StudyStatus.DRAFT && (
              <BasicPopover
                trigger={
                  <DotsThree
                    className="cursor-pointer text-theme-900"
                    size={20}
                  />
                }
                options={[
                  {
                    text: "Delete this draft",
                    icon: <Trash />,
                    color: "text-red-500",
                    onClick: () => setShowDeleteConfirmation(true),
                  },
                ]}
              />
            )}
          </div>
        </div>
        <div className="text-sm text-theme-600">
          Create your study and get started distributing!
        </div>
        <div className="mt-4 h-[1px] w-full bg-theme-200" />
      </div>
      <div className="flex flex-col gap-6">
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
        <div>
          {questionValidations.some((isValid) => !isValid) && (
            <div className="text-sm text-red-500">
              {questionValidations.filter((isValid) => !isValid).length === 1
                ? "Error on Question"
                : "Errors on Questions"}{" "}
              {questionValidations
                .map((isValid, index) => (!isValid ? index + 1 : null))
                .filter((index): index is number => index !== null)
                .join(", ")}
              . Fix to save
            </div>
          )}
        </div>
        <Button
          onClick={async () => {
            if (!allQuestionsValid) {
              showErrorToast(
                "Please fix errors in all questions before saving",
              );
              return;
            }

            if (study?.status === StudyStatus.DRAFT) {
              setShowPublishConfirmation(true);
            } else {
              setShowUpdateConfirmation(true);
            }
          }}
          className="mt-2 text-theme-off-white"
          disabled={
            (!hasUnsavedChanges && study?.status === StudyStatus.PUBLISHED) ||
            updateStudyQuestionsMutation.isPending ||
            !allQuestionsValid
          }
        >
          {updateStudyQuestionsMutation.isPending
            ? "Saving..."
            : study?.status === StudyStatus.PUBLISHED
              ? "Update Study"
              : "Save or Publish"}
        </Button>
      </div>
    </div>
  );
}
