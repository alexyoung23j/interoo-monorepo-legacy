import { FollowUpQuestion, Question, VideoStimulusType, FollowUpLevel } from "./generated/client";

export interface TranscribeAndGenerateNextQuestionRequest {
    initialQuestion: string;
    initialQuestionId: string;
    initialResponse: string | null;
    responseIdToStore: string;
    followUpQuestions: string[];
    followUpResponses: string[];
    interviewSessionId: string;
    nextQuestionId: string;
    followUpLevel: FollowUpLevel;
    questionContext: string;
    studyBackground: string;
    shouldFollowUp: boolean;
}

export class TranscribeAndGenerateNextQuestionRequestBuilder {
  private data: TranscribeAndGenerateNextQuestionRequest = {
    initialQuestion: "",
    initialQuestionId: "",
    initialResponse: null,
    responseIdToStore: "",
    followUpQuestions: [],
    followUpResponses: [],
    interviewSessionId: "",
    nextQuestionId: "",
    followUpLevel: FollowUpLevel.AUTOMATIC,
    questionContext: "",
    studyBackground: "",
    shouldFollowUp: false
  };

  setInitialQuestion(val: string): this {
    this.data.initialQuestion = val;
    return this;
  }

  setInitialQuestionId(val: string): this {
    this.data.initialQuestionId = val;
    return this;
  }

  setInitialResponse(val: string | null): this {
    this.data.initialResponse = val;
    return this;
  }

  setResponseIdToStore(val: string): this {
    this.data.responseIdToStore = val;
    return this;
  }

  setFollowUpQuestions(val: string[]): this {
    this.data.followUpQuestions = val;
    return this;
  }

  setFollowUpResponses(val: string[]): this {
    this.data.followUpResponses = val;
    return this;
  }

  setInterviewSessionId(val: string): this {
    this.data.interviewSessionId = val;
    return this;
  }

  setNextQuestionId(val: string): this {
    this.data.nextQuestionId = val;
    return this;
  }

  setFollowUpLevel(val: FollowUpLevel): this {
    this.data.followUpLevel = val;
    return this;
  }

  setQuestionContext(val: string): this {
    this.data.questionContext = val;
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

  // Add this method
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
