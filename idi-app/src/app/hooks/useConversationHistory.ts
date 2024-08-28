import { useMemo } from "react";
import {
  FollowUpQuestion,
  InterviewSession,
  Question,
  Study,
  Response,
} from "@shared/generated/client";
import { BaseQuestionObject } from "@shared/types";

/**
 * Note that this will return base questions that are not yet answered. See the "thread" field on each question
 * to establish whether they have been answered
 * @param study - The study object
 * @param interviewSession - The interview session object
 * @returns The conversation history
 */
export function useConversationHistory(
  study: Study & { questions: Question[] },
  interviewSession:
    | (InterviewSession & {
        responses: Response[];
        FollowUpQuestions: FollowUpQuestion[];
      })
    | undefined,
) {
  return useMemo(() => {
    const baseQuestions = study.questions;

    return baseQuestions.map((question) => {
      const baseQuestionObject: BaseQuestionObject = {
        text: question.title,
        isResponse: false,
        isFollowUp: false,
        thread: [],
        id: question.id,
      };

      const response = interviewSession?.responses.find(
        (r) => r.questionId === question.id && r.followUpQuestionId === null,
      );
      if (response) {
        baseQuestionObject.thread.push({
          text: response.fastTranscribedText,
          isResponse: true,
          isFollowUp: false,
          id: response.id,
        });

        // Add follow-up questions and their responses
        const followUps =
          interviewSession?.FollowUpQuestions.filter(
            (fq) => fq.parentQuestionId === question.id,
          ) ?? [];
        followUps.forEach((followUp) => {
          baseQuestionObject.thread.push({
            text: followUp.title,
            isResponse: false,
            isFollowUp: true,
            id: followUp.id,
          });

          const followUpResponse = interviewSession?.responses.find(
            (r) => r.followUpQuestionId === followUp.id,
          );
          if (followUpResponse) {
            baseQuestionObject.thread.push({
              text: followUpResponse.fastTranscribedText,
              isResponse: true,
              isFollowUp: true,
              id: followUpResponse.id,
            });
          }
        });
      }

      return baseQuestionObject;
    });
  }, [study, interviewSession]);
}
