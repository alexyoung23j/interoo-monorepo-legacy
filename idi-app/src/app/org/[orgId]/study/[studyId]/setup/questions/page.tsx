"use client";

import QuestionSetupSection, {
  LocalQuestion,
} from "@/app/_components/org/setup/QuestionSetupSection";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { BasicProgressBar } from "@/app/_components/reusable/BasicProgressBar";
import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  QuestionType,
  FollowUpLevel,
  Question,
} from "@shared/generated/client";

export default function QuestionsPage({
  params,
}: {
  params: { studyId: string };
}) {
  const { data: fetchedQuestions, isLoading } =
    api.studies.getStudyQuestions.useQuery({
      studyId: params.studyId,
    });

  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isValid, setIsValid] = useState(false);

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
      }));
      setQuestions(localQuestions);
    }
  }, [fetchedQuestions]);

  const addNewQuestion = () => {
    const newQuestion: LocalQuestion = {
      title: "",
      questionType: undefined,
      followUpLevel: undefined,
      shouldFollowUp: undefined,
      questionOrder: questions.length,
      hasStimulus: false,
    };
    setQuestions([...questions, newQuestion]);
    setHasUnsavedChanges(true);
  };

  const handleQuestionChange =
    (index: number) => (updatedQuestion: LocalQuestion) => {
      const newQuestions = [...questions];
      newQuestions[index] = updatedQuestion;
      setQuestions(newQuestions);
      setHasUnsavedChanges(true);
    };

  const handleValidationChange = (index: number) => (isValid: boolean) => {
    // Implement logic to track validity of all questions
  };

  const saveQuestions = async () => {
    // Implement the logic to save questions
    // You might want to use a mutation here
    setHasUnsavedChanges(false);
  };

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
      <BasicCard className={`flex flex-col gap-6 p-6 shadow-standard`}>
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
            onChange={handleQuestionChange(index)}
            onValidationChange={handleValidationChange(index)}
          />
        ))}
        <Button onClick={addNewQuestion}>Add New Question</Button>
        <Button
          onClick={saveQuestions}
          disabled={!isValid || !hasUnsavedChanges}
        >
          Save Questions
        </Button>
      </BasicCard>
    </div>
  );
}
