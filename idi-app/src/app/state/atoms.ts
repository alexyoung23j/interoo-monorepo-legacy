import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  Response,
  InterviewSession,
  FollowUpQuestion,
} from "@shared/generated/client";
import { CurrentQuestionType } from "@shared/types";

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
    set(currentQuestionAtom, null);
    set(responsesAtom, []);
    set(interviewSessionAtom, null);
  },
);

export const mediaAccessAtom = atom<{
  microphone: boolean;
  camera: boolean;
}>({
  microphone: false,
  camera: false,
});

export const uploadSessionUrlAtom = atom<string | null>(null);
