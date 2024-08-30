import { FollowUpQuestion, Question, VideoStimulusType } from "./generated/client";

export interface TranscribeAndGenerateNextQuestionRequest {
    initialQuestion: string;
    initialResponse?: string;
    responseIdToStore: string
    followUpQuestions: string[];
    followUpResponses: string[];
    interviewSessionId: string;
    nextQuestionId: string;
    followUpLevel: string;
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

export interface TranscribeAndGenerateNextQuestionResponse {
  nextQuestionId: string;
  nextQuestionText: string;
  isFollowUp: string;

}

// NEed to keep up to date with Prisma schema
export type BaseQuestionExtended = Question & {
  imageStimuli?: {
    bucketUrl: string;
    altText?: string | null;
    title?: string | null;
  }[];
  videoStimuli?: {
    url: string;
    title?: string | null;
    type: VideoStimulusType;
  }[];
  websiteStimuli?: {
    websiteUrl: string;
    title?: string | null;
  }[];
  multipleChoiceOptions?: {
    id: string;
    optionText: string;
    optionOrder: number;
  }[];
}

export type CurrentQuestionType = BaseQuestionExtended | FollowUpQuestion;
