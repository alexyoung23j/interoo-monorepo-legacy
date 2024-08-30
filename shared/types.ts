import { FollowUpQuestion, Question, VideoStimulusType } from "./generated/client";

export interface TranscribeAndGenerateNextQuestionRequest {
    initialQuestion: string;
    initialQuestionId: string;
    initialResponse?: string;
    responseIdToStore: string
    followUpQuestions: string[];
    followUpResponses: string[];
    interviewSessionId: string;
    nextQuestionId: string;
    followUpLevel: string;
    questionContext: string;
    studyBackground: string;
    shouldFollowUp: boolean;
}

export type ConversationState = Array<{ 
  questionText: string;
  responseText?: string;
  questionId: string;
  responseId?: string;
}>

export interface TranscribeAndGenerateNextQuestionRequest {
  nextBaseQuestionId: string;
  currentBaseQuestionId: string;
  currentBaseQuestionContext: string;
  interviewSessionId: string;
  followUpLevel: string;
  studyBackground: string;
  shouldFollowUp: boolean;
  currentResponseId: string;
  thread: ConversationState
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
  nextQuestionId?: string;
  isFollowUp: boolean;
  followUpQuestion?: FollowUpQuestion
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
