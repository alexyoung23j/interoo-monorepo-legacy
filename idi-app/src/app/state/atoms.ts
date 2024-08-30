import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  Question,
  Response,
  InterviewSession,
  FollowUpQuestion,
} from "@shared/generated/client";
import { CurrentQuestionType } from "@shared/types";

export const currentQuestionAtom = atomWithStorage<CurrentQuestionType | null>(
  "currentQuestion",
  null,
);
export const responsesAtom = atomWithStorage<Response[]>("responses", []);
export const interviewSessionAtom = atomWithStorage<
  | (InterviewSession & {
      responses: Response[];
      FollowUpQuestions: FollowUpQuestion[];
    })
  | null
>("interviewSession", null);

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
