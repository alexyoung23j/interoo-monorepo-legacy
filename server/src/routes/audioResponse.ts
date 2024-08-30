import { Router } from "express";
import { Request, Response } from "express";
import Busboy from 'busboy';
import { transcribeAudio, decideFollowUpPromptIfNecessary, getFollowUpLevelValue } from "../utils/audioProcessing";
import { FollowUpLevel } from "../../../shared/generated/client";
import { prisma } from "..";
import { TranscribeAndGenerateNextQuestionRequestBuilder, ConversationState, TranscribeAndGenerateNextQuestionResponse, TranscribeAndGenerateNextQuestionRequest } from "../../../shared/types";

const router = Router();

const handleAudioResponse = async (req: Request, res: Response) => {
  const startTime = Date.now();
  let transcriptionTime = 0;
  let dbUpdateTime = 0;
  let followUpDecisionTime = 0;

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
          const thread: ConversationState = JSON.parse(val);
          requestDataBuilder.setThread(thread);
        } catch (error) {
          console.warn('Failed to parse thread, setting as empty array');
          requestDataBuilder.setThread([]);
        }
        break;
      default:
        console.warn(`Unexpected field: ${fieldname}`);
    }
  });

  busboy.on('finish', async () => {
    const requestData = requestDataBuilder.build();

    if (!audioBuffer || !requestData.currentBaseQuestionId || !requestData.studyBackground || !requestData.nextBaseQuestionId || !requestData.nextBaseQuestionId || !requestData.interviewSessionId || !requestData.currentResponseId) {
      console.log({ requestData });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const transcriptionStartTime = Date.now();
      const transcribedText = await transcribeAudio(audioBuffer);
      transcriptionTime = Date.now() - transcriptionStartTime;

      // Update the Response row with the transcribed text and the InterviewSession with the next question
      const dbUpdateStartTime = Date.now();
     
      const newResponse = await prisma.response.update({
          where: { id: requestData.currentResponseId },
          data: { fastTranscribedText: transcribedText }
        });
      
      dbUpdateTime = Date.now() - dbUpdateStartTime;

      const followUpLevelValue = getFollowUpLevelValue(requestData.followUpLevel);

      let response: TranscribeAndGenerateNextQuestionResponse = {
        isFollowUp: false,
        transcribedText: transcribedText
      };

      if (!requestData.shouldFollowUp || requestData.thread.length > followUpLevelValue) {
        response.isFollowUp = requestData.thread.length > 0;
        response.nextQuestionId = requestData.nextBaseQuestionId;
        // We don't have follow ups, so just move to the next question
        prisma.$transaction(async (prisma) => {
          await prisma.interviewSession.update({
            where: { id: requestData.interviewSessionId },
            data: { currentQuestionId: requestData.nextBaseQuestionId }
          });
        });
      } else {
        const followUpStartTime = Date.now();
        const { shouldFollowUp, followUpQuestion } = await decideFollowUpPromptIfNecessary(requestData, transcribedText);
        followUpDecisionTime = Date.now() - followUpStartTime;

        if (shouldFollowUp && followUpQuestion) {
          response.isFollowUp = true;

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

          const newFollowUp = updatedSession.FollowUpQuestions[0];
          response.followUpQuestion = newFollowUp;
        } else {
          response.isFollowUp = requestData.thread.length > 0;
          response.nextQuestionId = requestData.nextBaseQuestionId;
          // We don't have follow ups, so just move to the next question
          prisma.$transaction(async (prisma) => {
            await prisma.interviewSession.update({
              where: { id: requestData.interviewSessionId },
              data: { currentQuestionId: requestData.nextBaseQuestionId }
            });
          });
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`Audio processing times:
        Total time: ${totalTime}ms
        Transcription time: ${transcriptionTime}ms
        DB update time: ${dbUpdateTime}ms
        Follow-up decision time: ${followUpDecisionTime}ms`);

      res.json(response);
    } catch (error) {
      console.error('Error processing audio response:', error);
      res.status(500).json({ error: 'Internal server error', message: String(error) });
    }
  });

  busboy.on('error', (error) => {
    console.error('Error processing form data:', error);
    res.status(500).json({ error: 'Error processing form data' });
  });

  req.pipe(busboy);
};

router.post('/', handleAudioResponse);

export const audioResponseRoute = router;