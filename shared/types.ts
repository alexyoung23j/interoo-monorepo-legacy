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

export type CurrentQuestionType = Question | FollowUpQuestion;
