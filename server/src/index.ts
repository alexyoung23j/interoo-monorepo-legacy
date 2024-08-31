import express from "express";
import { PrismaClient } from "../../shared/generated/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { createClient as createDeepgramClient } from "@deepgram/sdk";

// Import routes
import { protectedRoute } from "./routes/test/protected";
import { audioResponseRoute } from "./routes/audioResponse";
import { testFollowUpRoute } from "./routes/test/testFollowUp";
import { getSignedUrlRoute } from "./routes/getUploadUrls";
import { testTranscribeRoute } from "./routes/test/testTranscribe";

// Configuration and Setup
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();
const port = process.env.PORT || 8800;
export const prisma = new PrismaClient();
export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY!);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.options("*", cors());

// Routes
app.use("/protected", protectedRoute);
app.use("/api/audio-response", audioResponseRoute);
app.use("/api/get-signed-url", getSignedUrlRoute);
app.use("/test-follow-up", testFollowUpRoute);
app.use("/test-transcribe", testTranscribeRoute);

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

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});