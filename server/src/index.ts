import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../shared/generated/client";
import { Response as InterviewResponse } from "../../shared/generated/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import Busboy from 'busboy';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { MessageContent, MessageContentText } from "@langchain/core/messages";
import { createClient as createDeepgramClient } from "@deepgram/sdk";


// Get __dirname equivalent in ES modules
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();

// Use PORT provided in environment or default to 3000
const port = process.env.PORT || 8800;

// Create Prisma client
const prisma = new PrismaClient();

// Create Supabase client 
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Create Deepgram client
const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY!);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Supabase auth middleware
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.log("got invalid");
    return res.status(401).json({ error: "Invalid token" });
  }

  (req as any).user = data.user;
  next();
};

// Middleware to parse JSON bodies
app.use(express.json());

// Handle preflight requests
app.options("*", cors());

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.send(`Hello World!`);
});

// Debug route
app.get("/debug", (req, res) => {
  res.json({ message: "Server is running" });
});

// Protected route example
app.get("/protected", authMiddleware, async (req: Request, res: Response) => {
  res.json({ message: "This is a protected route", user: (req as any).user });
});

// TODO: set up langsmith
app.post('/api/audio-response', async (req: Request, res: Response) => {
  const startTime = Date.now();
  let transcriptionTime = 0;
  let dbOperationsTime = 0;
  let followUpDecisionTime = 0;

  const busboy = Busboy({ 
    headers: req.headers,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  let audioBuffer: Buffer | null = null;
  let questionId: string | null = null;
  let interviewSessionId: string | null = null;
  let followUpQuestionId: string | null = null;

  busboy.on('file', (fieldname, file, filename) => {
    if (fieldname === 'audio') {
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      file.on('end', () => {
        audioBuffer = Buffer.concat(chunks);
      });
    }
  });

  busboy.on('field', (fieldname, val) => {
    if (fieldname === 'questionId') questionId = val;
    if (fieldname === 'interviewSessionId') interviewSessionId = val;
    if (fieldname === 'followUpQuestionId') followUpQuestionId = val;
  });

  busboy.on('finish', async () => {
    try {
      if (!audioBuffer || !questionId || !interviewSessionId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Transcribe audio to text
      const transcriptionStartTime = Date.now();
      const transcribedText = await transcribeAudio(audioBuffer);
      transcriptionTime = Date.now() - transcriptionStartTime;

      // DB operations
      const dbStartTime = Date.now();
      const latestResponse = await prisma.response.create({
        data: {
          interviewSessionId,
          questionId,
          followUpQuestionId,
          fastTranscribedText: transcribedText,
        },
      });

      // Fetch necessary data for follow-up decision
      // TODO: check if shouldFollowUp is true and shouldFollowUpLevel
      const question = await prisma.question.findUnique({ where: { id: questionId }, include: { study: true } });
      const study = question?.study; // Get the study directly from the question

      const sortedFollowUpQuestions = await prisma.followUpQuestion.findMany({
        where: {
          interviewSessionId: interviewSessionId,
          parentQuestionId: questionId,
        },
        orderBy: {
          followUpQuestionOrder: 'asc', // Sort by followUpQuestionOrder
        },
      });

      // Get initial response if current response is a follow-up
      let initialResponse: InterviewResponse | null = null;
      if (followUpQuestionId) {
        initialResponse = await prisma.response.findFirst({
          where: {
            interviewSessionId: interviewSessionId,
            questionId: questionId,
          },
        });
      }

      // Get follow-up responses and sort based on the order of follow-up questions
      const followUpResponses = await prisma.response.findMany({
        where: {
          followUpQuestionId: {
            in: sortedFollowUpQuestions.map(q => q.id),
          },
        },
      });
      const sortedFollowUpResponses = followUpResponses.sort((a, b) => {
        const questionA = sortedFollowUpQuestions.find(q => q.id === a.followUpQuestionId);
        const questionB = sortedFollowUpQuestions.find(q => q.id === b.followUpQuestionId);
        return (questionA?.followUpQuestionOrder || 0) - (questionB?.followUpQuestionOrder || 0);
      });

      dbOperationsTime = Date.now() - dbStartTime;

      if (!question || !study) {
        return res.status(404).json({ error: 'Question or study not found' });
      }

      // Decide on follow-up prompt
      const followUpStartTime = Date.now();
      const followUpPrompt = await decideFollowUpPromptIfNecessary(
        question.body || "",
        initialResponse?.fastTranscribedText || "",
        sortedFollowUpQuestions.map(q => q.body || ''),
        sortedFollowUpResponses.map(r => r.fastTranscribedText || ''),
        question.context || '',
        study.studyBackground || ''
      );
      followUpDecisionTime = Date.now() - followUpStartTime;

      const totalTime = Date.now() - startTime;
      console.log(`Audio processing times:
        Total time: ${totalTime}ms
        Transcription time: ${transcriptionTime}ms
        DB operations time: ${dbOperationsTime}ms
        Follow-up decision time: ${followUpDecisionTime}ms`);

      res.json({ latestResponse, followUpPrompt });
    } catch (error) {
      console.error('Error processing audio response:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  busboy.on('error', (error) => {
    console.error('Error processing form data:', error);
    res.status(500).json({ error: 'Error processing form data' });
  });

  req.pipe(busboy);
});

// Transcribe audio function
async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: "nova-2",
      }
    );

    return result?.results.channels[0].alternatives[0].transcript ?? '';
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
}

// Decide on follow-up prompt function
async function decideFollowUpPromptIfNecessary(
  initialQuestionBody: string,
  initialQuestionResponse: string,
  followUpQuestions: string[],
  followUpResponses: string[],
  questionContext: string,
  studyBackground: string
): Promise<string | null> {

    // Build the conversation history
    let conversationHistory = `Initial Question: ${initialQuestionBody}\nInitial Response: ${initialQuestionResponse}\n`;
    for (let i = 0; i < followUpQuestions.length; i++) {
        conversationHistory += `Follow-up Question ${i + 1}: ${followUpQuestions[i]}\n`;
        conversationHistory += `Follow-up Response ${i + 1}: ${followUpResponses[i]}\n`;
    }

    // Initialize LangChain components
    const promptTemplate = `You are a qualitative research interviewer bot designed to extract insights from a participant. 
      You are executing an in-depth-interview for a study and this is the study's background: {bg}
      
      Here is the context for the question you asked: {ctx}
      
      Here is the conversation history so far:
      {conversation_history}
      
      Based on this conversation history, the background of the study, and the context of the question, 
      decide if a follow-up question is needed.
      
      Respond with "yes: <Question text of follow up question here>" if you think a follow-up question is needed.
      Respond with "no" if a follow-up question is not needed and you have gotten mostly sufficient information.
      Do not engage with the participant about anything other than this research interview. If that happens, just return "no".`;

    const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);

    console.log("Prompt template:", promptTemplate);

    const llm = new ChatOpenAI({model: "gpt-4o"});
    const chain = prompt.pipe(llm);

    const response = await chain.invoke({ 
      bg: studyBackground, 
      ctx: questionContext, 
      conversation_history: conversationHistory
    });

    const extractedText = extractTextFromResponse(response.content);
    return extractedText === '' ? null : extractedText;
}

function extractTextFromResponse(content: MessageContent): string | null {
  if (typeof content === 'string') {
    return content;
  } else if (Array.isArray(content)) {
    const textContents = content
      .filter((item): item is MessageContentText => item.type === 'text')
      .map(item => item.text);
    return textContents.join(' ');
  }
  return null;
}


// --- Test endpoints ---

// Test endpoint for decideFollowUpPromptIfNecessary
app.post('/test-follow-up', async (req, res) => {
  try {
    const {
      questionBody,
      followUpQuestions,
      followUpResponses,
      transcribedText,
      questionContext,
      studyBackground
    } = req.body;

    const result = await decideFollowUpPromptIfNecessary(
      questionBody,
      followUpQuestions,
      followUpResponses,
      transcribedText,
      questionContext,
      studyBackground
    );

    res.json({ result });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint for audio transcription
app.post('/test-transcribe', (req: Request, res: Response) => {
  const busboy = Busboy({ headers: req.headers });
  let audioBuffer: Buffer | null = null;

  busboy.on('file', (fieldname, file, filename) => {
    if (fieldname === 'audio') {
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      file.on('end', () => {
        audioBuffer = Buffer.concat(chunks);
      });
    }
  });

  busboy.on('finish', async () => {
    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

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

// Start the server
app.listen(port as number, "0.0.0.0", function () {
  console.log(`Server is running on http://localhost:${port}`);

});

// Gracefully shut down the Prisma Client
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
