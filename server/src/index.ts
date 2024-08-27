import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../shared/generated/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";

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

// Start the server
app.listen(port as number, "0.0.0.0", function () {
  console.log(`Server is running on http://localhost:${port}`);

});

// create_response(input: audio (bytes), question_id, interview_session_id, flup_question_id)
// transcribe audio to fast_transcribed_text (Experiment with deepgram vs ?)
// store response to db
// decide_follow_up_prompt()
// potentially store FLUP question if decide_follow_up_prompt() returns a FLUP
// return whole Response + return optional FLUP question


// decide_follow_up_prompt(Question db object, FollowUpQuestion, transcribed text, Question Context, StudyBackground)
// know how many questions or flups came before with the order field
// prompt LLM to decide whether it should generate a follow up or not (and whether the question has follow ups enabled and how many follow ups are expected)
// LLM should FLUP or 'None'

// use langchain for this, experiment with different models
// set up langsmith

// Gracefully shut down the Prisma Client
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
