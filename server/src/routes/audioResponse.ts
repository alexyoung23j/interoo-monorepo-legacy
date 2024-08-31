import { Router } from "express";
import { Request, Response } from "express";
import Busboy from 'busboy';
import { transcribeAudio, decideFollowUpPromptIfNecessary, getFollowUpLevelRange } from "../utils/audioProcessing";
import { prisma } from "..";
import { TranscribeAndGenerateNextQuestionRequestBuilder, ConversationState, TranscribeAndGenerateNextQuestionResponse, TranscribeAndGenerateNextQuestionRequest } from "../../../shared/types";
import { createRequestLogger } from '../utils/logger';

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
            requestData.studyBackground && 
            requestData.nextBaseQuestionId && 
            requestData.interviewSessionId && 
            requestData.currentResponseId);
};

const processAudioResponse = async (
  audioBuffer: Buffer, 
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  requestLogger: ReturnType<typeof createRequestLogger>
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  const transcribedText = await transcribeAudio(audioBuffer, requestLogger);

  if (transcribedText.length < 5) {
    return handleNoTranscription(requestData, transcribedText);
  }

  const newResponse = await prisma.response.update({
    where: { id: requestData.currentResponseId },
    data: { fastTranscribedText: transcribedText }
  });

  const [minFollowUps, maxFollowUps] = getFollowUpLevelRange(requestData.followUpLevel);
  const numberOfPriorFollowUps = requestData.thread.filter(t => t.responseId === undefined).length;

  if (!requestData.shouldFollowUp || numberOfPriorFollowUps > maxFollowUps) {
    return handleNoFollowUp(requestData, transcribedText);
  } else {
    return handlePotentialFollowUp(requestData, transcribedText, newResponse, requestLogger);
  }
};

const handleNoTranscription = async (
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  transcribedText: string
): Promise<TranscribeAndGenerateNextQuestionResponse> => {


  return {
    isFollowUp: requestData.thread.length > 0,
    transcribedText: transcribedText,
    noAnswerDetected: false,
    nextQuestionId: requestData.currentBaseQuestionId
  };
};

const handleNoFollowUp = async (
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  transcribedText: string
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  await prisma.interviewSession.update({
    where: { id: requestData.interviewSessionId },
    data: { currentQuestionId: requestData.nextBaseQuestionId }
  });

  return {
    isFollowUp: requestData.thread.length > 0,
    transcribedText: transcribedText,
    noAnswerDetected: false,
    nextQuestionId: requestData.nextBaseQuestionId
  };
};

const handlePotentialFollowUp = async (
  requestData: TranscribeAndGenerateNextQuestionRequest, 
  transcribedText: string,
  newResponse: any,
  requestLogger: ReturnType<typeof createRequestLogger>
): Promise<TranscribeAndGenerateNextQuestionResponse> => {
  const { shouldFollowUp, followUpQuestion } = await decideFollowUpPromptIfNecessary(requestData, transcribedText, requestLogger);

  if (shouldFollowUp && followUpQuestion) {
    const updatedSession = await prisma.interviewSession.update({
      where: { id: requestData.interviewSessionId },
      data: {
        FollowUpQuestions: {
          create: {
            title: followUpQuestion,
            body: "",
            followUpQuestionOrder: requestData.thread.length + 1,
            parentQuestionId: requestData.currentBaseQuestionId,
            Response: {
              connect: { id: newResponse.id }
            }
          }
        }
      },
      include: {
        FollowUpQuestions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    });

    return {
      isFollowUp: true,
      transcribedText: transcribedText,
      followUpQuestion: updatedSession.FollowUpQuestions[0],
      noAnswerDetected: false
    };
  } else {
    return handleNoFollowUp(requestData, transcribedText);
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