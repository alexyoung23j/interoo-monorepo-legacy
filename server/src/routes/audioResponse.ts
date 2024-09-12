import { Router } from "express";
import { Request, Response } from "express";
import Busboy from 'busboy';
import { transcribeAudio, decideFollowUpPromptIfNecessary, getFollowUpLevelRange } from "../utils/audioProcessing";
import { prisma } from "..";
import { TranscribeAndGenerateNextQuestionRequestBuilder, ConversationState, TranscribeAndGenerateNextQuestionResponse, TranscribeAndGenerateNextQuestionRequest, BoostedKeyword } from "../../../shared/types";
import { createRequestLogger } from '../utils/logger';
import { InterviewSessionStatus } from "@shared/generated/client";

const router = Router();

const extractRequestData = (req: Request): Promise<{ audioBuffer: Buffer, requestData: TranscribeAndGenerateNextQuestionRequest }> => {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ 
      headers: req.headers,
      limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    });

    let audioBuffer: Buffer | null = null;
    const requestDataBuilder = new TranscribeAndGenerateNextQuestionRequestBuilder();

    busboy.on('file', (fieldname, file, filename) => {
      if (fieldname === 'audio') {
        const chunks: Buffer[] = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => audioBuffer = Buffer.concat(chunks));
      }
    });

    busboy.on('field', (fieldname, val) => {
      switch(fieldname) {
        case 'nextBaseQuestionId':
        case 'currentBaseQuestionId':
        case 'currentBaseQuestionContext':
        case 'interviewSessionId':
        case 'followUpLevel':
        case 'studyBackground':
        case 'currentResponseId':
        case 'interviewStartTime':
        case 'currentTime':
          requestDataBuilder.set(fieldname as keyof TranscribeAndGenerateNextQuestionRequest, val);
          break;
        case 'numTotalEstimatedInterviewQuestions':
        case 'currentQuestionNumber':
          requestDataBuilder.set(fieldname as keyof TranscribeAndGenerateNextQuestionRequest, parseInt(val, 10));
          break;
        case 'shouldFollowUp':
          requestDataBuilder.setShouldFollowUp(val === 'true');
          break;
        case 'thread':
          try {
            const thread = JSON.parse(val);
            requestDataBuilder.setThread(thread);
          } catch (error) {
            console.warn('Failed to parse thread, setting as empty array', error);
            requestDataBuilder.setThread([]);
          }
          break;
        case 'targetInterviewLength':
          requestDataBuilder.setTargetInterviewLength(val ? parseInt(val, 10) : undefined);
          break;
        case 'boostedKeywords':
          try {
            const boostedKeywords = val ? JSON.parse(val) as BoostedKeyword[] : [];
            requestDataBuilder.setBoostedKeywords(boostedKeywords);
          } catch (error) {
            console.warn('Failed to parse boostedKeywords, setting as empty array', error);
            requestDataBuilder.setBoostedKeywords([]);
          }
          break;
        default:
          console.warn(`Unexpected field: ${fieldname}`);
      }
    });

    busboy.on('finish', () => {
      const requestData = requestDataBuilder.build();
      if (!audioBuffer) {
        reject(new Error('Missing audio file'));
      } else {
        resolve({ audioBuffer, requestData });
      }
    });

    busboy.on('error', reject);

    req.pipe(busboy);
  });
};

const validateRequestData = (requestData: TranscribeAndGenerateNextQuestionRequest): boolean => {
  return !!(requestData.currentBaseQuestionId && 
            requestData.interviewSessionId && 
            requestData.currentResponseId);
};

const handleNoTranscription = async (
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  transcribedText: string
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  return {
    id: requestData.currentResponseId,
    isFollowUp: requestData.thread.length > 0,
    transcribedText: transcribedText,
    noAnswerDetected: true,
    isJunkResponse: true,
    questionId: requestData.currentBaseQuestionId,
    nextQuestionId: requestData.currentBaseQuestionId,
  };
};

// TODO(update this to call new method to update response, use exsiting response.followUpQuestionId in response, and comvine these 2 queriess)
const handleNoFollowUp = async (
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  transcribedText: string
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  
  // Update the response with the transcription
  const updatedResponse = await updateResponseWithTranscription(requestData.currentResponseId, transcribedText, false);

  if (requestData.nextBaseQuestionId) {
    await prisma.interviewSession.update({
      where: { id: requestData.interviewSessionId },
      data: { 
        currentQuestionId: requestData.nextBaseQuestionId,
        lastUpdatedTime: new Date().toISOString()
      }
    });
  } else {
    await prisma.interviewSession.update({
      where: { id: requestData.interviewSessionId },
      data: {
        status: InterviewSessionStatus.COMPLETED
      }
    });
  }

  return {
    id: requestData.currentResponseId,
    isFollowUp: requestData.thread.length > 0,
    transcribedText: transcribedText,
    noAnswerDetected: false,
    questionId: requestData.currentBaseQuestionId,
    nextQuestionId: requestData.nextBaseQuestionId,
    isJunkResponse: false
  };
};

const handlePotentialFollowUp = async (
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  transcribedText: string,
  requestLogger: ReturnType<typeof createRequestLogger>,
  minFollowUps: number,
  maxFollowUps: number,
  currentNumberOfFollowUps: number
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  const { shouldFollowUp, followUpQuestion, isJunkResponse } = await decideFollowUpPromptIfNecessary(requestData, transcribedText, requestLogger, minFollowUps, maxFollowUps, currentNumberOfFollowUps);

  // Update the response with the transcription
  await updateResponseWithTranscription(requestData.currentResponseId, transcribedText, isJunkResponse);

  if (shouldFollowUp && followUpQuestion) {
    const updatedSession = await prisma.interviewSession.update({
      where: { id: requestData.interviewSessionId },
      data: {
        FollowUpQuestions: {
          create: {
            title: followUpQuestion,
            body: "",
            followUpQuestionOrder: requestData.thread.filter(item => item.threadItem.type === 'question').length,
            parentQuestionId: requestData.currentBaseQuestionId,
          }
        },
        lastUpdatedTime: new Date().toISOString()
      },
      include: {
        FollowUpQuestions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    });

    return {
      id: requestData.currentResponseId,
      isFollowUp: true,
      transcribedText: transcribedText,
      nextFollowUpQuestion: updatedSession.FollowUpQuestions[0],
      noAnswerDetected: false,
      isJunkResponse: isJunkResponse,
      questionId: requestData.currentBaseQuestionId
    };
  } else {
    return handleNoFollowUp(requestData, transcribedText);
  }
};

const shouldFollowUpBasedOnTime = (requestData: TranscribeAndGenerateNextQuestionRequest): boolean => {
  const requestLogger = createRequestLogger();

  if (!requestData.targetInterviewLength) {
    return true; // If no target length is set, always allow follow-ups
  }

  const startTime = new Date(requestData.interviewStartTime);
  const currentTime = new Date(requestData.currentTime);
  const elapsedTimeInMinutes = (currentTime.getTime() - startTime.getTime()) / (1000 * 60);

  const targetTimePerQuestion = requestData.targetInterviewLength / requestData.numTotalEstimatedInterviewQuestions;
  const expectedElapsedTime = targetTimePerQuestion * (requestData.currentQuestionNumber+1);

  // If we're more than 10% behind schedule, don't follow up
  if (elapsedTimeInMinutes > expectedElapsedTime * 1.1) {
    requestLogger.info('Not following up because we\'re more than 10% behind schedule', { elapsedTimeInMinutes, expectedElapsedTime });
    return false;
  }

  // If we have less than 80% of the target time remaining for the rest of the questions, don't follow up
  const remainingQuestions = requestData.numTotalEstimatedInterviewQuestions - requestData.currentQuestionNumber;
  const remainingTime = requestData.targetInterviewLength - elapsedTimeInMinutes;
  if (remainingTime / remainingQuestions < targetTimePerQuestion * 0.8) {
    requestLogger.info('Not following up because we\'re less than 80% of the target time remaining for the rest of the questions', { remainingTime, remainingQuestions, targetTimePerQuestion });
    return false;
  }

  return true;
}

const updateResponseWithTranscription = async (responseId: string, transcribedText: string, isJunkResponse: boolean) => {
  return await prisma.response.update({
    where: { id: responseId },
    data: { fastTranscribedText: transcribedText, junkResponse: isJunkResponse, updatedAt: new Date().toISOString() }
  });
};

const processAudioResponse = async (
  audioBuffer: Buffer, 
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  requestLogger: ReturnType<typeof createRequestLogger>
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  const transcribedText = await transcribeAudio(audioBuffer, requestLogger, requestData.boostedKeywords);

  if (transcribedText.length < 2) {
    // Handle no transcription, likely bad audio
    return handleNoTranscription(requestData, transcribedText);
  }

  const [minFollowUps, maxFollowUps] = getFollowUpLevelRange(requestData.followUpLevel);
  const numberOfPriorFollowUps = requestData.thread.filter(t => t.threadItem.type === "response" && t.threadItem.isJunkResponse === false).length - 1;

  console.log(requestData.thread);
  console.log(maxFollowUps);
  console.log(requestData.shouldFollowUp);

  if (!requestData.shouldFollowUp || 
      numberOfPriorFollowUps > maxFollowUps || 
      !shouldFollowUpBasedOnTime(requestData)) {
    return handleNoFollowUp(requestData, transcribedText);
  } else {
    return handlePotentialFollowUp(requestData, transcribedText, requestLogger, minFollowUps, maxFollowUps, numberOfPriorFollowUps);
  }
};

// Route Start
const handleAudioResponse = async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger();
  const startTime = Date.now();

  requestLogger.info('Starting audio response processing');

  try {
    const { audioBuffer, requestData } = await extractRequestData(req);

    if (!validateRequestData(requestData)) {
      requestLogger.warn('Missing required fields', { requestData });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const response = await processAudioResponse(audioBuffer, requestData, requestLogger);
    console.log("is junk response?", response.isJunkResponse);

    const totalTime = Date.now() - startTime;
    requestLogger.info('Audio endpoint completed', { totalTime });

    res.json(response);
  } catch (error) {
    requestLogger.error('Error processing audio response', { error: String(error) });
    res.status(500).json({ error: 'Internal server error', message: String(error) });
  }
};

router.post('/', handleAudioResponse);

export const audioResponseRoute = router;