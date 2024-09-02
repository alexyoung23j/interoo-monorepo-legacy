import express from "express";
import { PrismaClient } from "@shared/generated/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { Storage } from "@google-cloud/storage";
import { createClient as createDeepgramClient } from "@deepgram/sdk";


// Import routes
import { protectedRoute } from "./routes/test/protected";
import { audioResponseRoute } from "./routes/audioResponse";
import { testFollowUpRoute } from "./routes/test/testFollowUp";
import { getSignedUrlRoute } from "./routes/getSignedUrl";
import { testTranscribeRoute } from "./routes/test/testTranscribe";
import { getTtsAudioRoute } from "./routes/getTtsAudio";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";


// Configuration and Setup
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });


const app = express();
const port = process.env.PORT || 8800;
export const prisma = new PrismaClient();
export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY!);
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  scopes: 'https://www.googleapis.com/auth/cloud-platform',
  credentials: {
    client_email: process.env.GOOGLE_STORAGE_EMAIL,
    private_key: (process.env.GOOGLE_STORAGE_PRIVATE_KEY as string).replace(/\\n/gm, "\n")
  }
})

// Creates a client

export const bucketName = process.env.GCS_BUCKET_NAME || 'idi-assets';
export const bucket = storage.bucket(bucketName);

// Middleware to add API key to requests
app.use((req, res, next) => {
  req.headers['x-goog-api-key'] = process.env.GOOGLE_CLOUD_API_KEY;
  next();
});
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());


// Routes
app.use("/protected", protectedRoute);
app.use("/api/audio-response", audioResponseRoute);
app.use("/api/get-signed-url", getSignedUrlRoute);
app.use("/api/get-tts-audio", getTtsAudioRoute);
app.use("/test-follow-up", testFollowUpRoute);
app.use("/test-transcribe", testTranscribeRoute);

// Server Startup
const startServer = () => {
  app.listen(port as number, "0.0.0.0", () => console.log(`Server is running on http://localhost:${port}`));
};

if (process.env.NODE_ENV === 'development') {
  if (require.main === module) {
    startServer();
  }
  module.exports = app;
} else {
  startServer();
}

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