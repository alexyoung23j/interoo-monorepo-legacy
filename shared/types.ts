import { FollowUpQuestion, Question, VideoStimulusType, FollowUpLevel } from "./generated/client";

export type ConversationState = Array<{ 
  questionText?: string;
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

export class TranscribeAndGenerateNextQuestionRequestBuilder {
  private data: TranscribeAndGenerateNextQuestionRequest = {
    nextBaseQuestionId: "",
    currentBaseQuestionId: "",
    currentBaseQuestionContext: "",
    interviewSessionId: "",
    followUpLevel: "",
    studyBackground: "",
    shouldFollowUp: false,
    currentResponseId: "",
    thread: []
  };

  setNextBaseQuestionId(val: string): this {
    this.data.nextBaseQuestionId = val;
    return this;
  }

  setCurrentBaseQuestionId(val: string): this {
    this.data.currentBaseQuestionId = val;
    return this;
  }

  setCurrentBaseQuestionContext(val: string): this {
    this.data.currentBaseQuestionContext = val;
    return this;
  }

  setInterviewSessionId(val: string): this {
    this.data.interviewSessionId = val;
    return this;
  }

  setFollowUpLevel(val: string): this {
    this.data.followUpLevel = val;
    return this;
  }

  setStudyBackground(val: string): this {
    this.data.studyBackground = val;
    return this;
  }

  setShouldFollowUp(val: boolean): this {
    this.data.shouldFollowUp = val;
    return this;
  }

  setCurrentResponseId(val: string): this {
    this.data.currentResponseId = val;
    return this;
  }

  setThread(val: ConversationState): this {
    this.data.thread = val;
    return this;
  }

  set<K extends keyof TranscribeAndGenerateNextQuestionRequest>(
    key: K,
    value: TranscribeAndGenerateNextQuestionRequest[K]
  ): this {
    (this.data as any)[key] = value;
    return this;
  }

  build(): TranscribeAndGenerateNextQuestionRequest {
    return this.data;
  }
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
  followUpQuestion?: FollowUpQuestion,
  transcribedText: string
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
