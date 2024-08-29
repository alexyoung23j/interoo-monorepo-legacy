import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../shared/generated/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import Busboy from 'busboy';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { MessageContent, MessageContentText } from "@langchain/core/messages";
import { createClient as createDeepgramClient } from "@deepgram/sdk";
import { TranscribeAndGenerateNextQuestionRequest, UploadUrlRequest,  } from "../../shared/types";
import { FollowUpLevel } from "../../shared/generated/client";

// Configuration and Setup
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();
const port = process.env.PORT || 8800;
const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY!);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.options("*", cors());

// Auth Middleware
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: "Invalid token" });

  (req as any).user = data.user;
  next();
};

// Helper Functions
const transcribeAudio = async (audioBuffer: Buffer): Promise<string> => {
  try {
    const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, { model: "nova-2" });
    return result?.results.channels[0].alternatives[0].transcript ?? '';
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
};

const decideFollowUpPromptIfNecessary = async (
  initialQuestionBody: string,
  initialQuestionResponse: string,
  followUpQuestions: string[],
  followUpResponses: string[],
  questionContext: string,
  studyBackground: string
): Promise<string | null> => {
  const conversationHistory = buildConversationHistory(initialQuestionBody, initialQuestionResponse, followUpQuestions, followUpResponses);
  const promptTemplate = buildPromptTemplate();
  const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);
  const llm = new ChatOpenAI({model: "gpt-4o"});
  const chain = prompt.pipe(llm);

  const response = await chain.invoke({ 
    bg: studyBackground, 
    ctx: questionContext, 
    conversation_history: conversationHistory
  });

  return extractTextFromResponse(response.content);
};

const buildConversationHistory = (initialQuestion: string, initialResponse: string, followUpQuestions: string[], followUpResponses: string[]): string => {
  let history = `Initial Question: ${initialQuestion}\nInitial Response: ${initialResponse}\n`;
  for (let i = 0; i < followUpQuestions.length; i++) {
    history += `Follow-up Question ${i + 1}: ${followUpQuestions[i]}\n`;
    history += `Follow-up Response ${i + 1}: ${followUpResponses[i]}\n`;
  }
  return history;
};

const buildPromptTemplate = (): string => {
  return `You are a qualitative research interviewer bot designed to extract insights from a participant. 
    You are executing an in-depth-interview for a study and this is the study's background: {bg}
    
    Here is the context for the question you asked: {ctx}
    
    Here is the conversation history so far:
    {conversation_history}
    
    Based on this conversation history, the background of the study, and the context of the question, 
    decide if a follow-up question is needed.
    
    Respond with "yes: <Question text of follow up question here>" if you think a follow-up question is needed.
    Respond with "no" if a follow-up question is not needed and you have gotten mostly sufficient information.
    Do not engage with the participant about anything other than this research interview. If that happens, just return "no".`;
};

const extractTextFromResponse = (content: MessageContent): string | null => {
  if (typeof content === 'string') {
    return content;
  } else if (Array.isArray(content)) {
    const textContents = content
      .filter((item): item is MessageContentText => item.type === 'text')
      .map(item => item.text);
    return textContents.join(' ');
  }
  return null;
};

const getFollowUpLevelValue = (level: string): number => {
  switch (level.toUpperCase()) {
    case FollowUpLevel.AUTOMATIC:
      return 3;
    case FollowUpLevel.SURFACE:
      return 1;
    case FollowUpLevel.LIGHT:
      return 2;
    case FollowUpLevel.DEEP:
      return 5;
    default:
      return 1
  }
};

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
    if (!audioBuffer || !requestData.initialQuestion || !requestData.questionContext || !requestData.studyBackground || !requestData.responseIdToStore || !requestData.nextQuestionId || !requestData.interviewSessionId) {
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

        await prisma.interviewSession.update({
          where: { id: requestData.interviewSessionId },
          data: { 
            currentQuestionId: requestData.nextQuestionId,
            lastUpdatedTime: new Date()
          }
        });
      });
      dbUpdateTime = Date.now() - dbUpdateStartTime;

      let followUpPrompt = null;
      const followUpLevelValue = getFollowUpLevelValue(requestData.followUpLevel || FollowUpLevel.AUTOMATIC);

      if ((requestData.followUpResponses?.length || 0) < followUpLevelValue) {
        const followUpStartTime = Date.now();
        followUpPrompt = await decideFollowUpPromptIfNecessary(
          requestData.initialQuestion,
          requestData.initialResponse || "",
          requestData.followUpQuestions || [],
          requestData.followUpResponses || [],
          requestData.questionContext,
          requestData.studyBackground
        );
        followUpDecisionTime = Date.now() - followUpStartTime;
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

// Routes
app.get("/", (req: Request, res: Response) => res.send(`Hello World!`));
app.get("/debug", (req: Request, res: Response) => res.json({ message: "Server is running" }));
app.get("/protected", authMiddleware, (req: Request, res: Response) => res.json({ message: "This is a protected route", user: (req as any).user }));
app.post('/api/audio-response', handleAudioResponse);

app.post('/api/get-upload-urls', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      organizationId, 
      studyId, 
      questionId, 
      responseId, 
      audio, 
      video 
    }: UploadUrlRequest = req.body;

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'assets';

    // Generate base path
    const basePath = path.join(organizationId, studyId, questionId, responseId);

    // Generate signed URL for audio
    const audioFileName = `audio.${audio.fileExtension}`;
    const audioFilePath = path.join(basePath, audioFileName);
    const audioSignedUrl = await generateSignedUrl(bucketName, audioFilePath);

    let videoSignedUrl = null;
    if (video) {
      // Generate signed URL for video if requested
      const videoFileName = `video.${video.fileExtension}`;
      const videoFilePath = path.join(basePath, videoFileName);
      videoSignedUrl = await generateSignedUrl(bucketName, videoFilePath);
    }

    // Fetch the existing Response
    const existingResponse = await prisma.response.findUnique({
      where: { id: responseId },
      select: { fastTranscribedText: true }
    });

    if (!existingResponse) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Create ResponseMedia
    const responseMedia = await prisma.responseMedia.create({
      data: {
        responseId: responseId,
        audioBucketUrl: audioSignedUrl.path,
        videoBucketUrl: videoSignedUrl ? videoSignedUrl.path : null,
        transcribedText: existingResponse.fastTranscribedText
      }
    });

    // Return signed URLs
    res.json({
      audio: audioSignedUrl,
      video: videoSignedUrl
    });

  } catch (error) {
    console.error('Error generating signed URLs:', error);
    res.status(500).json({ error: 'Failed to generate upload URLs' });
  }
});

async function generateSignedUrl(bucketName: string, filePath: string) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUploadUrl(filePath);

  if (error) {
    throw error;
  }

  return {
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token
  };
}

// Test Routes
app.post('/test-follow-up', async (req, res) => {
  try {
    const { questionBody, followUpQuestions, followUpResponses, transcribedText, questionContext, studyBackground } = req.body;
    const result = await decideFollowUpPromptIfNecessary(questionBody, followUpQuestions, followUpResponses, transcribedText, questionContext, studyBackground);
    res.json({ result });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/test-transcribe', (req: Request, res: Response) => {
  const busboy = Busboy({ headers: req.headers });
  let audioBuffer: Buffer | null = null;

  busboy.on('file', (fieldname, file, filename) => {
    if (fieldname === 'audio') {
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => audioBuffer = Buffer.concat(chunks));
    }
  });

  busboy.on('finish', async () => {
    if (!audioBuffer) return res.status(400).json({ error: 'No audio file provided' });
    try {
      const transcribedText = await transcribeAudio(audioBuffer);
      res.json({ transcribedText });
    } catch (error) {
      console.error('Error transcribing audio:', error);
      res.status(500).json({ error: 'Failed to transcribe audio' });
    }
  });

  req.pipe(busboy);
});

// Server Startup
app.listen(port as number, "0.0.0.0", () => console.log(`Server is running on http://localhost:${port}`));

// Graceful Shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
