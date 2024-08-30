import { Router } from "express";
import { Request, Response } from "express";
import Busboy from 'busboy';
import { transcribeAudio, decideFollowUpPromptIfNecessary, getFollowUpLevelValue } from "../utils/audioProcessing";
import { FollowUpLevel } from "../../../shared/generated/client";
import { TranscribeAndGenerateNextQuestionRequest } from "../../../shared/types";
import { prisma } from "..";

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
  const requestData: Partial<TranscribeAndGenerateNextQuestionRequest> = {
    followUpQuestions: [],
    followUpResponses: [],
  };

  busboy.on('file', (fieldname, file, filename) => {
    if (fieldname === 'audio') {
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => audioBuffer = Buffer.concat(chunks));
    }
  });

  busboy.on('field', (fieldname, val) => {
    switch(fieldname) {
      case 'followUpQuestions':
      case 'followUpResponses':
        try {
          requestData[fieldname] = JSON.parse(val);
        } catch (error) {
          console.warn(`Failed to parse ${fieldname}, setting as empty array`);
          requestData[fieldname] = [];
        }
        break;
      case 'initialResponse':
        requestData.initialResponse = val || undefined;
        break;
      case 'initialQuestion':
      case 'questionContext':
      case 'studyBackground':
      case 'responseIdToStore':
      case 'interviewSessionId':
      case 'nextQuestionId':
      case 'followUpLevel':
        requestData[fieldname] = val;
        break;
    }
  });

  busboy.on('finish', async () => {
    if (!audioBuffer || !requestData.initialQuestion || !requestData.studyBackground || !requestData.responseIdToStore || !requestData.nextQuestionId || !requestData.interviewSessionId) {
      console.log({ requestData });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const transcriptionStartTime = Date.now();
      const transcribedText = await transcribeAudio(audioBuffer);
      transcriptionTime = Date.now() - transcriptionStartTime;

      // Update the Response row with the transcribed text and the InterviewSession with the next question
      const dbUpdateStartTime = Date.now();
      await prisma.$transaction(async (prisma) => {
        await prisma.response.update({
          where: { id: requestData.responseIdToStore },
          data: { fastTranscribedText: transcribedText }
        });
      });
      dbUpdateTime = Date.now() - dbUpdateStartTime;

      const followUpLevelValue = getFollowUpLevelValue(requestData.followUpLevel || FollowUpLevel.AUTOMATIC);

      if ((requestData.followUpResponses?.length || 0) < followUpLevelValue) {
        const followUpStartTime = Date.now();
        const {shouldFollowUp, followUpQuestion} = await decideFollowUpPromptIfNecessary(
          requestData.initialQuestion,
          requestData.initialResponse ?? "",
          requestData.followUpQuestions ?? [],
          requestData.followUpResponses ?? [],
          requestData.questionContext ?? "",
          requestData.studyBackground
        );
        followUpDecisionTime = Date.now() - followUpStartTime;
      } else {
        // We don't have follow ups, so just move the 
        await prisma.$transaction(async (prisma) => {
            await prisma.interviewSession.update({
              where: { id: requestData.interviewSessionId },
              data: { currentQuestionId: requestData.nextQuestionId }
            });
          });
      }

      const totalTime = Date.now() - startTime;
      console.log(`Audio processing times:
        Total time: ${totalTime}ms
        Transcription time: ${transcriptionTime}ms
        DB update time: ${dbUpdateTime}ms
        Follow-up decision time: ${followUpDecisionTime}ms`);

      res.json({ transcribedText, followUpPrompt });
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