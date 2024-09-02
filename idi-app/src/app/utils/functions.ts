import {
  InterviewSession,
  Study,
  FollowUpQuestion,
  Question,
  Response,
  FollowUpLevel,
} from "@shared/generated/client";
import {
  CurrentQuestionType,
  TranscribeAndGenerateNextQuestionRequest,
  ConversationState,
} from "@shared/types";

interface CalculateRequestParams {
  currentQuestion: CurrentQuestionType | null;
  interviewSession: InterviewSession | null;
  study: Study & { questions: Question[] };
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
    questionText: currentBaseQuestion.title,
    responseText: undefined,
    questionId: currentBaseQuestion.id,
    responseId: undefined,
  });

  // Find the response to the base question
  const baseResponse = responses.find(
    (r) => r.questionId === currentBaseQuestion.id,
  );
  if (baseResponse) {
    currentQuestionThreadState.push({
      questionText: undefined,
      responseText: baseResponse.fastTranscribedText,
      questionId: currentBaseQuestion.id,
      responseId: baseResponse.id,
    });
  }

  // Function to recursively add follow-up questions and their responses
  const addFollowUps = (parentQuestionId: string, level: number) => {
    const followUps = followUpQuestions
      .filter((q) => q.parentQuestionId === parentQuestionId)
      .sort((a, b) => a.followUpQuestionOrder - b.followUpQuestionOrder);

    for (const followUp of followUps) {
      currentQuestionThreadState.push({
        questionText: followUp.title,
        responseText: undefined,
        questionId: followUp.id,
        responseId: undefined,
      });

      const followUpResponse = responses.find(
        (r) => r.followUpQuestionId === followUp.id,
      );
      if (followUpResponse) {
        currentQuestionThreadState.push({
          questionText: undefined,
          responseText: followUpResponse.fastTranscribedText,
          questionId: followUp.id,
          responseId: followUpResponse.id,
        });
      }

      // Recursively add nested follow-ups
      addFollowUps(followUp.id, level + 1);
    }
  };

  // Start adding follow-ups from the base question
  addFollowUps(currentBaseQuestion.id, 1);

  return {
    nextBaseQuestionId: nextBaseQuestion?.id ?? "",
    currentBaseQuestionId: currentBaseQuestion.id,
    currentBaseQuestionContext: currentBaseQuestion.context ?? "",
    interviewSessionId: interviewSession?.id ?? "",
    followUpLevel: currentBaseQuestion.followUpLevel,
    studyBackground: study.studyBackground ?? "",
    shouldFollowUp: isFollowUp
      ? true
      : ((currentQuestion as Question).shouldFollowUp ?? false),
    currentResponseId: currentResponseId,
    thread: currentQuestionThreadState,
  };
}
