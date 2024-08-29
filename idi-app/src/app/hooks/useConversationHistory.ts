import { useMemo } from "react";
import {
  FollowUpQuestion,
  InterviewSession,
  Question,
  Study,
  Response,
} from "@shared/generated/client";
import { TranscribeAndGenerateNextQuestionRequest } from "@shared/types";

export function useConversationHistory(
  study: Study & { questions: Question[] },
  currentQuestionId: string,
  currentResponseId: string,
  interviewSession:
    | (InterviewSession & {
        responses: Response[];
        FollowUpQuestions: FollowUpQuestion[];
      })
    | undefined,
): TranscribeAndGenerateNextQuestionRequest | null {
  return useMemo(() => {
    const currentQuestion = study.questions.find(
      (q) => q.id === currentQuestionId,
    );
    if (!currentQuestion) return null;

    const result: TranscribeAndGenerateNextQuestionRequest = {
      initialQuestion: currentQuestion.title,
      initialResponse: undefined,
      responseIdToStore: currentResponseId,
      followUpQuestions: [],
      followUpResponses: [],
      questionContext: currentQuestion.context || "",
      studyBackground: study.studyBackground || "",
      interviewSessionId: interviewSession?.id ?? "",
      nextQuestionId: "",
    };

    // Find initial response
    const response = interviewSession?.responses.find(
      (r) =>
        r.questionId === currentQuestionId && r.followUpQuestionId === null,
    );
    if (response) {
      result.initialResponse = response.fastTranscribedText;
    }

    // Process follow-up questions and responses
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

    return result;
  }, [study, currentQuestionId, currentResponseId, interviewSession]);
}
