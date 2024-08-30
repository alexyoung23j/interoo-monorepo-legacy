import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  Question,
  Response,
  InterviewSession,
  FollowUpQuestion,
} from "@shared/generated/client";
import { ConversationState, CurrentQuestionType } from "@shared/types";

export const currentQuestionAtom = atom<CurrentQuestionType | null>(null);
export const currentResponseAtom = atom<Response | null>(null);
export const responsesAtom = atom<Response[]>([]);
export const followUpQuestionsAtom = atom<FollowUpQuestion[]>([]);

// Only read from this atom for data about the interviewSession that isn't going to change during the performance
export const interviewSessionAtom = atom<
  | (InterviewSession & {
      responses: Response[];
      FollowUpQuestions: FollowUpQuestion[];
    })
  | null
>(null);

export const initializeInterviewAtom = atom(
  null,
  async (get, set, interviewSessionId: string) => {
    // Remove the useQuery call from here
    // We'll handle the data fetching in the component
    set(currentQuestionAtom, null);
    set(responsesAtom, []);
    set(interviewSessionAtom, null);
  },
);
