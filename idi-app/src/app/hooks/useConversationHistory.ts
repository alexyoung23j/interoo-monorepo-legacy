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
  interviewSession:
    | (InterviewSession & {
        responses: Response[];
        FollowUpQuestions: FollowUpQuestion[];
      })
    | undefined,
): TranscribeAndGenerateNextQuestionRequest[] {
  return useMemo(() => {
    return study.questions.map((question) => {
      const result: TranscribeAndGenerateNextQuestionRequest = {
        initialQuestion: question.title,
        initialResponse: undefined,
        followUpQuestions: [],
        followUpResponses: [],
        questionContext: question.context || "",
        studyBackground: study.studyBackground || "",
      };

      // Find initial response
      const response = interviewSession?.responses.find(
        (r) => r.questionId === question.id && r.followUpQuestionId === null,
      );
      if (response) {
        result.initialResponse = response.fastTranscribedText;
      }

      // Process follow-up questions and responses
      const followUps =
        interviewSession?.FollowUpQuestions.filter(
          (fq) => fq.parentQuestionId === question.id,
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
    });
  }, [study, interviewSession]);
}
