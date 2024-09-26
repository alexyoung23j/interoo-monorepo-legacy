"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { BasicProgressBar } from "@/app/_components/reusable/BasicProgressBar";
import QuestionSetupSection, {
  LocalQuestion,
} from "@/app/_components/org/setup/QuestionSetupSection";

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
        multipleChoiceOptions: [],
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
    },
    [],
  );

  if (isLoading) {
    return <div>Loading...</div>;
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
        </div>
        {questions.map((question, index) => (
          <QuestionSetupSection
            key={question.id ?? index}
            question={question}
            onChange={(updatedQuestion) =>
              handleQuestionChange(index, updatedQuestion)
            }
            onValidationChange={() => {}}
          />
        ))}
      </BasicCard>
    </div>
  );
}
