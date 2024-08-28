import { FollowUpQuestion, Question } from "./generated/client";

export interface ConversationItem {
    text: string;
    isResponse: boolean;
    isFollowUp: boolean;
    id: string;
}
  
export interface BaseQuestionObject {
    text: string;
    isResponse: boolean;
    isFollowUp: boolean;
    thread: ConversationItem[];
    id: string;
}

export type CurrentQuestionType = Question | FollowUpQuestion;
