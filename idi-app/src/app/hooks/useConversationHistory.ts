import { useMemo } from "react";
import {
  FollowUpQuestion,
  InterviewSession,
  Question,
  Study,
  Response,
  FollowUpLevel,
} from "@shared/generated/client";
import {
  TranscribeAndGenerateNextQuestionRequest,
  CurrentQuestionType,
} from "@shared/types";

export function useConversationHistory(
  study: Study & { questions: Question[] },
  currentQuestion: CurrentQuestionType,
  currentResponseId: string,
  interviewSession:
    | (InterviewSession & {
        responses: Response[];
        FollowUpQuestions: FollowUpQuestion[];
      })
    | undefined,
): TranscribeAndGenerateNextQuestionRequest | null {
  return useMemo(() => {
    if (!currentQuestion) return null;

    const isFollowUp = "parentQuestionId" in currentQuestion;
    const currentQuestionId = currentQuestion.id;

    // This is either the parentQuestion or the currentQuestion itself
    const parentQuestion: Question = isFollowUp
      ? study.questions.find(
          (q) =>
            q.id === (currentQuestion as FollowUpQuestion).parentQuestionId,
        )!
      : (currentQuestion as Question);

    const result: TranscribeAndGenerateNextQuestionRequest = {
      initialQuestion: isFollowUp
        ? parentQuestion?.title
        : currentQuestion.title,
      initialQuestionId: isFollowUp ? parentQuestion?.id : currentQuestionId,
      initialResponse: undefined,
      responseIdToStore: currentResponseId,
      followUpQuestions: [],
      followUpResponses: [],
      questionContext: isFollowUp ? "" : (currentQuestion.context ?? ""),
      studyBackground: study.studyBackground ?? "",
      interviewSessionId: interviewSession?.id ?? "",
      nextQuestionId: "",
      followUpLevel: isFollowUp
        ? FollowUpLevel.AUTOMATIC
        : currentQuestion.followUpLevel,
      shouldFollowUp: isFollowUp ? true : currentQuestion.shouldFollowUp,
    };

    // Find initial response
    const response = interviewSession?.responses.find(
      (r) =>
        r.questionId === currentQuestionId ||
        r.followUpQuestionId === currentQuestionId,
    );
    if (response) {
      result.initialResponse = response.fastTranscribedText;
    }

    // Process follow-up questions and responses for both main and follow-up questions
    const followUps =
      interviewSession?.FollowUpQuestions.filter(
        (fq) => fq.parentQuestionId === currentQuestionId,
      ) ?? [];
    followUps.forEach((followUp) => {
      result.followUpQuestions.push(followUp.title);

      const followUpResponse = interviewSession?.responses.find(
        (r) => r.followUpQuestionId === followUp.id,
      );
      result.followUpResponses.push(
        followUpResponse?.fastTranscribedText ?? "",
      );
    });

    const currentQuestionOrder = parentQuestion.questionOrder;
    const nextQuestion = study.questions.find(
      (q) => q.questionOrder === currentQuestionOrder + 1,
    );
    result.nextQuestionId = nextQuestion?.id ?? "";

    if (isFollowUp) {
      result.followUpQuestions.push(currentQuestion?.title ?? "");
    }

    return result;
  }, [study, currentQuestion, currentResponseId, interviewSession]);
}
