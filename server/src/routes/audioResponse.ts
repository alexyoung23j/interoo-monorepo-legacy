import e, { Router } from "express";
import { Request, Response } from "express";
import Busboy from 'busboy';
import { transcribeAudio, decideFollowUpPromptIfNecessary, getFollowUpLevelRange } from "../utils/audioProcessing";
import { prisma } from "..";
import { TranscribeAndGenerateNextQuestionRequestBuilder, ConversationState, TranscribeAndGenerateNextQuestionResponse, TranscribeAndGenerateNextQuestionRequest, FullTranscriptBlob } from "../../../shared/types";
import { createRequestLogger } from '../utils/logger';
import { BoostedKeyword, InterviewSessionStatus } from "@shared/generated/client";
import { bucket, bucketName } from "../index";
import axios from "axios";
import path from "path";
import { googleAuth } from "../index";

const router = Router();

export async function triggerAnalysisJobsSetup(interviewSessionId: string): Promise<void> {
  const targetAudience = `https://us-central1-${process.env.GOOGLE_CLOUD_PROJECT_ID}.cloudfunctions.net/setUpAnalysis`;
  const url = targetAudience;

  try {
    const client = await googleAuth.getIdTokenClient(targetAudience);
    
    // Trigger function and move on
    client.request({
      url,
      method: 'POST',
      data: { interviewSessionId },
    }).then(response => {
      console.log('Analysis jobs setup completed successfully:', response.data);
    }).catch(error => {
      console.error('Error running analysis jobs setup:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response:', error.response.status, error.response.data);
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Error setting up request:', error.message);
        }
      } else {
        console.error('Unexpected error:', error);
      }
    });

    console.log('Analysis jobs setup request initiated for session:', interviewSessionId);
  } catch (error) {
    console.error('Error getting ID token client:', error);
    throw error;
  }
}

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
      console.log(`Received field: ${fieldname}, value: ${val}`); // Debug log
      switch(fieldname) {
        case 'nextBaseQuestionId':
        case 'currentBaseQuestionId':
        case 'currentBaseQuestionContext':
        case 'interviewSessionId':
        case 'followUpLevel':
        case 'studyBackground':
        case 'currentResponseId':
        case 'currentResponseStartTime':
        case 'currentResponseEndTime':
        case 'organizationId':
        case 'studyId':
        case 'contentType':
          requestDataBuilder.set(fieldname as keyof TranscribeAndGenerateNextQuestionRequest, val);
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
        case 'currentQuestionNumber':
        case 'elapsedInterviewTime':
        case 'numTotalEstimatedInterviewQuestions':
        case 'targetInterviewLength':
          requestDataBuilder.set(
            fieldname as keyof TranscribeAndGenerateNextQuestionRequest, 
            val ? parseInt(val, 10) : undefined
          );
          console.log(`Set ${fieldname}: ${val ? parseInt(val, 10) : undefined}`);
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

const calculateElapsedTimeMs = (requestData: TranscribeAndGenerateNextQuestionRequest): number => {
  const currentResponseTimeMs = new Date(requestData.currentResponseEndTime).getTime() - new Date(requestData.currentResponseStartTime).getTime();
  return requestData.elapsedInterviewTime + currentResponseTimeMs;
};

const handleNoTranscription = async (
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  transcribedText: string,
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  const basePath = path.join(requestData.organizationId, requestData.studyId, requestData.currentBaseQuestionId, requestData.currentResponseId);
  const fileName = 'recording';
  const filePath = path.join(basePath, fileName);

  const [signedUrl] = await bucket.file(filePath).getSignedUrl({
    version: 'v4',
    action: 'resumable',
    expires: Date.now() + 30 * 60 * 1000, // URL expires in 30 minutes
    contentType: requestData.contentType,
  });

  // Initiate the resumable upload session
  const response = await axios.post(signedUrl, null, {
    headers: {
      'Content-Type': requestData.contentType,
      'X-Goog-Resumable': 'start',
      'Origin': process.env.FRONTEND_URL
    }
  });

  const newSessionUrl = response.headers['location'];

  if (!newSessionUrl) {
    throw new Error('Failed to get new session URL');
  }

  return {
    id: requestData.currentResponseId,
    isFollowUp: requestData.thread.length > 0,
    transcribedText: transcribedText,
    noAnswerDetected: true,
    isJunkResponse: true,
    questionId: requestData.currentBaseQuestionId,
    nextQuestionId: requestData.currentBaseQuestionId,
    newSessionUrl: newSessionUrl,
  };
};

const handleNoFollowUp = async (
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  transcribedText: string,
  fullTranscriptBlob: FullTranscriptBlob,
  elapsedTimeMs: number
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  // Update the response with the transcription
  const updatedResponse = await updateResponseWithTranscription(requestData.currentResponseId, transcribedText, false, fullTranscriptBlob, requestData);

  if (requestData.nextBaseQuestionId) {
    await prisma.interviewSession.update({
      where: { id: requestData.interviewSessionId },
      data: { 
        currentQuestionId: requestData.nextBaseQuestionId,
        lastUpdatedTime: new Date().toISOString(),
        elapsedTime: elapsedTimeMs,
        status: InterviewSessionStatus.IN_PROGRESS
      }
    });
  } else {
    await prisma.interviewSession.update({
      where: { id: requestData.interviewSessionId },
      data: {
        status: InterviewSessionStatus.COMPLETED,
        elapsedTime: elapsedTimeMs,
        lastUpdatedTime: new Date().toISOString(),
      }
    });
    triggerAnalysisJobsSetup(requestData.interviewSessionId);
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
  fullTranscriptBlob: FullTranscriptBlob,
  requestLogger: ReturnType<typeof createRequestLogger>,
  minFollowUps: number,
  maxFollowUps: number,
  wouldBeNextFollowUpNumber: number,
  elapsedTimeMs: number
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  const { shouldFollowUp, followUpQuestion, isJunkResponse } = await decideFollowUpPromptIfNecessary(requestData, transcribedText, requestLogger, minFollowUps, maxFollowUps, wouldBeNextFollowUpNumber);

  // Update the response with the transcription
  await updateResponseWithTranscription(requestData.currentResponseId, transcribedText, isJunkResponse, fullTranscriptBlob, requestData);


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
        lastUpdatedTime: new Date().toISOString(),
        elapsedTime: elapsedTimeMs,
        status: InterviewSessionStatus.IN_PROGRESS
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
    return handleNoFollowUp(requestData, transcribedText, fullTranscriptBlob, elapsedTimeMs);
  }
};

const shouldFollowUpBasedOnTime = (requestData: TranscribeAndGenerateNextQuestionRequest, elapsedTimeMs: number): boolean => {
  const requestLogger = createRequestLogger();

  if (!requestData.targetInterviewLength) {
    return true; // If no target length is set, always allow follow-ups
  }

  const elapsedTimeMinutes = elapsedTimeMs / (1000 * 60);
  const targetTimePerQuestion = requestData.targetInterviewLength / requestData.numTotalEstimatedInterviewQuestions;
  const expectedElapsedTime = targetTimePerQuestion * (requestData.currentQuestionNumber + 1);

  // If we're more than 30% behind schedule, don't follow up
  if (elapsedTimeMinutes > expectedElapsedTime * 3) { // TODO: hone this
    requestLogger.info('Not following up because we\'re more than 100% behind schedule', { elapsedTimeMinutes, expectedElapsedTime });
    return false;
  }

  return true;
}

const updateResponseWithTranscription = async (responseId: string, transcribedText: string, isJunkResponse: boolean, fullTranscriptBlob: FullTranscriptBlob, requestData: TranscribeAndGenerateNextQuestionRequest) => {
  console.log('Updating response with transcription:', {
    responseId,
    createdAt: new Date(requestData.currentResponseStartTime).toISOString(),
    updatedAt: new Date(requestData.currentResponseEndTime).toISOString(),
  });

  return await prisma.response.update({
    where: { id: responseId },
    data: { 
      fastTranscribedText: transcribedText, 
      junkResponse: isJunkResponse, 
      createdAt: new Date(requestData.currentResponseStartTime),
      updatedAt: new Date(requestData.currentResponseEndTime),
      transcriptionBody: fullTranscriptBlob
    }
  });
};

const processAudioResponse = async (
  audioBuffer: Buffer, 
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  requestLogger: ReturnType<typeof createRequestLogger>
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  const { transcribedText, fullTranscriptBlob } = await transcribeAudio(audioBuffer, requestLogger, requestData.boostedKeywords);

  if (transcribedText.length < 2) {
    // Handle no transcription, likely bad audio
    return handleNoTranscription(requestData, transcribedText);
  }

  const elapsedTimeMs = calculateElapsedTimeMs(requestData);

  const [minFollowUps, maxFollowUps] = getFollowUpLevelRange(requestData.followUpLevel);
  const wouldBeNextFollowUpNumber = requestData.thread.filter(t => t.threadItem.type === "response" && t.threadItem.isJunkResponse === false).length + 1;

  console.log(requestData.thread);
  console.log(maxFollowUps);
  console.log(requestData.shouldFollowUp);

  if (!requestData.shouldFollowUp || 
    wouldBeNextFollowUpNumber > maxFollowUps || 
      !shouldFollowUpBasedOnTime(requestData, elapsedTimeMs)) {
    return handleNoFollowUp(requestData, transcribedText, fullTranscriptBlob, elapsedTimeMs);
  } else {
    return handlePotentialFollowUp(requestData, transcribedText, fullTranscriptBlob, requestLogger, minFollowUps, maxFollowUps, wouldBeNextFollowUpNumber, elapsedTimeMs);
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