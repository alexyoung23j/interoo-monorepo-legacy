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

// Get __dirname equivalent in ES modules
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();

// Use PORT provided in environment or default to 3000
const port = process.env.PORT || 8800;

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

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

// create_response(input: audio (bytes), question_id, interview_session_id, flup_question_id)
// transcribe audio to fast_transcribed_text (Experiment with deepgram vs ?)
// store response to db
// decide_follow_up_prompt()
// potentially store FLUP question if decide_follow_up_prompt() returns a FLUP
// return whole Response + return optional FLUP question

// set up langsmith

app.post('/api/audio-response', authMiddleware, async (req: Request, res: Response) => {
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

      // Stub: Transcribe audio to text
      const transcribedText = await transcribeAudio(audioBuffer);

      // Create and store Response
      const response = await prisma.response.create({
        data: {
          interviewSessionId,
          questionId,
          followUpQuestionId,
          fastTranscribedText: transcribedText,
        },
      });

      // Fetch necessary data for follow-up decision
      const question = await prisma.question.findUnique({ where: { id: questionId } });
      const followUpQuestion = followUpQuestionId 
        ? await prisma.followUpQuestion.findUnique({ where: { id: followUpQuestionId } })
        : null;
      const study = await prisma.study.findFirst({ where: { questions: { some: { id: questionId } } } });

      if (!question || !study) {
        return res.status(404).json({ error: 'Question or study not found' });
      }

      // Decide on follow-up prompt
      const followUpPrompt = await decideFollowUpPromptIfNecessary(
        question,
        followUpQuestion,
        transcribedText,
        question.context || '',
        study.studyBackground || ''
      );

      res.json({ response, followUpPrompt });
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

// Stub: Transcribe audio function
async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  // TODO: Implement audio transcription using Deepgram or an alternative service
  // For now, return a placeholder text
  return "This is a placeholder for the transcribed text.";
}

// Decide on follow-up prompt function
async function decideFollowUpPromptIfNecessary(
  question: any,
  followUpQuestionsJoined: string,
  followUpResponsesJoined: string,
  transcribedText: string,
  questionContext: string,
  studyBackground: string
): Promise<string | null> {
  // Initialize LangChain components
    const prompt = ChatPromptTemplate.fromTemplate(
      `You are a qualitative research interviewer bot designed to extract insights from a participant. 
      You are executing an in-depth-interview for a study and this is the study's background: [{bg}]. 
      You have asked a question, and this is some context for the question: [{ctx}].
      The participant responded with: [{response}].
      There may have been follow-up questions to that question, and in turn, the participant may have responded with follow-up
      responses. I will provide them as lists below. The lists should be the same length, and each index corresponds to a single follow-up question and follow-up response.
      If the lists are empty, it means there have been no follow-up questions or responses for this question.
      Follow-Up Questions: [{maybeFollowUpQuestions}]
      Follow-Up Responses: [{maybeFollowUpResponses}]
      Respond with "yes: <Question text of follow up question here>" if you think based on the participant's
      response to the question, their follow-up responses to the follow-up questions (if they exist), the background 
      of the study, and the context of the question, that a follow up question is needed.
      Responsd with "no" if a follow-up questions is not needed and you have gotten mostly sufficient information.
      Do not engage with the participant about anything other than this research interview.`
    );
    const llm = new ChatOpenAI();
    const chain = prompt.pipe(llm);

    const response = await chain.invoke({ bg: studyBackground, ctx: questionContext, response: transcribedText, 
      maybeFollowUpQuestions: followUpQuestionsJoined, maybeFollowUpResponses: followUpResponsesJoined});

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
