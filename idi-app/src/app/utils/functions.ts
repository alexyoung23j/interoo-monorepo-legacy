import {
  InterviewSession,
  Study,
  FollowUpQuestion,
  Question,
  Response,
  FollowUpLevel,
  BoostedKeyword,
} from "@shared/generated/client";
import {
  CurrentQuestionType,
  TranscribeAndGenerateNextQuestionRequest,
  TranscribeAndGenerateNextQuestionRequestBuilder,
  ConversationState,
} from "@shared/types";

interface CalculateRequestParams {
  currentQuestion: CurrentQuestionType | null;
  interviewSession: InterviewSession | null;
  study: Study & {
    questions: Question[];
    boostedKeywords: BoostedKeyword[];
  };
  responses: Response[];
  followUpQuestions: FollowUpQuestion[];
  currentResponseId: string;
}

export function calculateTranscribeAndGenerateNextQuestionRequest({
  currentQuestion,
  interviewSession,
  study,
  responses,
  followUpQuestions,
  currentResponseId,
}: CalculateRequestParams): TranscribeAndGenerateNextQuestionRequest {
  if (!currentQuestion) {
    throw new Error("Current question is null");
  }

  const isFollowUp = "parentQuestionId" in currentQuestion;
  const currentBaseQuestion = isFollowUp
    ? study.questions.find((q) => q.id === currentQuestion.parentQuestionId)
    : (currentQuestion as Question);

  if (!currentBaseQuestion) {
    throw new Error("Current base question not found");
  }

  const currentQuestionOrder = currentBaseQuestion.questionOrder;
  const nextBaseQuestion = study.questions.find(
    (q) => q.questionOrder === currentQuestionOrder + 1,
  );

  // Construct the currentQuestionThreadState
  const currentQuestionThreadState: ConversationState = [];

  // Add the base question
  currentQuestionThreadState.push({
    threadItem: {
      questionId: currentBaseQuestion.id,
      questionText: currentBaseQuestion.title,
      type: "question",
    },
  });

  // Find the response to the base question
  const baseResponse = responses.find(
    (r) => r.questionId === currentBaseQuestion.id,
  );
  if (baseResponse) {
    currentQuestionThreadState.push({
      threadItem: {
        responseText: baseResponse.fastTranscribedText,
        questionId: currentBaseQuestion.id,
        responseId: baseResponse.id,
        type: "response",
        isJunkResponse: baseResponse.junkResponse,
      },
    });
  }

  // Add follow-up questions and their responses
  console.log("flups:", followUpQuestions);
  const followUps = followUpQuestions
    .filter((q) => q.parentQuestionId === currentBaseQuestion.id)
    .sort((a, b) => a.followUpQuestionOrder - b.followUpQuestionOrder);

  for (const followUp of followUps) {
    currentQuestionThreadState.push({
      threadItem: {
        questionId: followUp.id,
        questionText: followUp.title,
        type: "question",
      },
    });

    const followUpResponse = responses.find(
      (r) => r.followUpQuestionId === followUp.id,
    );
    if (followUpResponse) {
      currentQuestionThreadState.push({
        threadItem: {
          questionId: followUp.id,
          responseText: followUpResponse.fastTranscribedText,
          responseId: followUpResponse.id,
          type: "response",
          isJunkResponse: followUpResponse.junkResponse,
        },
      });
    }
  }

  console.log("currentQuestionThreadState", currentQuestionThreadState);

  // Calculate numTotalEstimatedInterviewQuestions for interview timing
  const estimateFollowUpsForQuestion = (question: Question): number => {
    switch (question.followUpLevel) {
      case FollowUpLevel.AUTOMATIC:
        return 2;
      case FollowUpLevel.SURFACE:
        return 1;
      case FollowUpLevel.LIGHT:
        return 2;
      case FollowUpLevel.DEEP:
        return 4;
      default:
        return 3;
    }
  };

  const completedFollowUps = followUpQuestions.length;
  const estimatedRemainingFollowUps = study.questions
    .slice(currentQuestionOrder)
    .reduce((sum, question) => sum + estimateFollowUpsForQuestion(question), 0);

  const totalBaseQuestions = study.questions.length;
  const numTotalEstimatedInterviewQuestions =
    totalBaseQuestions + completedFollowUps + estimatedRemainingFollowUps;

  // Calculate elapsedInterviewTime
  const elapsedInterviewTime = responses.reduce((total, response) => {
    const start = new Date(response.createdAt).getTime();
    const end = new Date(response.updatedAt).getTime();
    return total + (end - start);
  }, 0);

  // Use the builder to create the request
  const contentType =
    getSupportedMimeType(study.videoEnabled ?? false) ?? "video/webm";

  return new TranscribeAndGenerateNextQuestionRequestBuilder()
    .setNextBaseQuestionId(nextBaseQuestion?.id ?? "")
    .setCurrentBaseQuestionId(currentBaseQuestion.id)
    .setCurrentBaseQuestionContext(currentBaseQuestion.context ?? "")
    .setInterviewSessionId(interviewSession?.id ?? "")
    .setFollowUpLevel(currentBaseQuestion.followUpLevel)
    .setStudyBackground(study.studyBackground ?? "")
    .setShouldFollowUp(
      isFollowUp
        ? true
        : ((currentQuestion as Question).shouldFollowUp ?? false),
    )
    .setCurrentResponseId(currentResponseId)
    .setThread(currentQuestionThreadState)
    .setNumTotalEstimatedInterviewQuestions(numTotalEstimatedInterviewQuestions)
    .setElapsedInterviewTime(elapsedInterviewTime)
    .setCurrentQuestionNumber(currentQuestionOrder)
    .setTargetInterviewLength(study.targetLength ?? undefined)
    .setBoostedKeywords(study.boostedKeywords ?? [])
    .setOrganizationId(study.organizationId)
    .setStudyId(study.id)
    .setContentType(contentType)
    .build();
}

export function formatDuration(startDate: Date, endDate: Date): string {
  const duration = endDate.getTime() - startDate.getTime();
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export const getSupportedMimeType = (isVideoEnabled: boolean) => {
  const videoTypes = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  const audioTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];
  const types = isVideoEnabled ? videoTypes : audioTypes;

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  console.warn("No preferred mime types supported, falling back to default");
  return undefined;
};

export const formatElapsedTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${remainingMinutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
};

export const isIOSDevice = () => {
  if (typeof window === "undefined") return true;

  // Check for iOS devices using userAgent and maxTouchPoints
  const isIOS =
    // Check for iOS devices in user agent
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // Check for iPad specifically (newer iPads report as MacOS)
    (/Mac/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

  return isIOS;
};
