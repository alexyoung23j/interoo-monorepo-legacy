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
        return 3;
      case FollowUpLevel.SURFACE:
        return 2;
      case FollowUpLevel.LIGHT:
        return 3;
      case FollowUpLevel.DEEP:
        return 5;
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

  const interviewStartTime =
    interviewSession?.startTime?.toISOString() ?? new Date().toISOString();
  const currentTime = new Date().toISOString();

  // Use the builder to create the request
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
    .setInterviewStartTime(interviewStartTime)
    .setCurrentTime(currentTime)
    .setCurrentQuestionNumber(currentQuestionOrder)
    .setTargetInterviewLength(study.targetLength ?? undefined)
    .setBoostedKeywords(study.boostedKeywords ?? [])
    .build();
}
