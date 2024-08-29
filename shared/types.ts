import { FollowUpQuestion, Question } from "./generated/client";

export interface TranscribeAndGenerateNextQuestionRequest {
    initialQuestion: string;
    initialResponse?: string;
    responseIdToStore: string
    followUpQuestions: string[];
    followUpResponses: string[];
    questionContext: string;
    studyBackground: string;
}

export interface UploadUrlRequest {
    organizationId: string;
    studyId: string;
    questionId: string;
    responseId: string;
    audio: {
      fileExtension: string;
      contentType: string;
    };
    video?: {
      fileExtension: string;
      contentType: string;
    };
}

export type CurrentQuestionType = Question | FollowUpQuestion;
