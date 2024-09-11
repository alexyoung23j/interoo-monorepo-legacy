import { FollowUpQuestion, Question, VideoStimulusType, FollowUpLevel } from "./generated/client";
import { Response } from "./generated/client";

// Add this new type
export interface CurrentResponseAndUploadUrl {
  response: Response | null;
  uploadSessionUrl: string | null;
}

export type ConversationState = Array<{ 
  threadItem: QuestionInThread | ResponseInThread
}>

export type QuestionInThread = {
  questionText: string;
  questionId: string;
  type: "question";
}

export type ResponseInThread = {
  questionId: string;
  responseText: string;
  responseId: string;
  isJunkResponse: boolean;
  type: "response";
}

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
  numTotalEstimatedInterviewQuestions: number;
  interviewStartTime: string;
  currentTime: string;
  currentQuestionNumber: number;
  targetInterviewLength?: number; // in minutes
  boostedKeywords: BoostedKeyword[];
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
    thread: [],
    numTotalEstimatedInterviewQuestions: 0,
    interviewStartTime: "",
    currentTime: "",
    currentQuestionNumber: 0,
    targetInterviewLength: undefined,
    boostedKeywords: [],
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

  setNumTotalEstimatedInterviewQuestions(val: number): this {
    this.data.numTotalEstimatedInterviewQuestions = val;
    return this;
  }

  setInterviewStartTime(val: string): this {
    this.data.interviewStartTime = val;
    return this;
  }

  setCurrentTime(val: string): this {
    this.data.currentTime = val;
    return this;
  }

  setCurrentQuestionNumber(val: number): this {
    this.data.currentQuestionNumber = val;
    return this;
  }

  setTargetInterviewLength(val: number | undefined): this {
    this.data.targetInterviewLength = val;
    return this;
  }

  setBoostedKeywords(val: BoostedKeyword[]): this {
    this.data.boostedKeywords = val;
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
    interviewSessionId: string; // Change this from responseId
    fileExtension: string;
    contentType: string;
}

export interface TranscribeAndGenerateNextQuestionResponse {
  nextQuestionId?: string;
  isFollowUp: boolean;
  followUpQuestion?: FollowUpQuestion,
  transcribedText: string
  noAnswerDetected: boolean
  isJunkResponse: boolean
}

// Need to keep up to date with Prisma schema
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

export interface CurrentQuestionMetadataRequest {
  organizationId: string;
  studyId: string;
  questionId: string;
  interviewSessionId: string;
  followUpQuestionId?: string; // Add this line
  fileExtension: string;
  contentType: string;
}

export interface BoostedKeyword {
  id: string;
  keyword: string;
  definition: string | null;
}
