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
import { getTtsAudioRoute } from "./routes/getTtsAudio";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { getCurrentQuestionMetadataRoute } from "./routes/getCurrentQuestionMetadata";

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

export const ttsClient = new TextToSpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  scopes: 'https://www.googleapis.com/auth/cloud-platform',
  credentials: {
    client_email: process.env.GOOGLE_STORAGE_EMAIL,
    private_key: (process.env.GOOGLE_STORAGE_PRIVATE_KEY as string).replace(/\\n/gm, "\n")
  }
});
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
app.use("/api/get-tts-audio", getTtsAudioRoute);
app.use("/test-follow-up", testFollowUpRoute);
app.use("/api/get-current-question-metadata", getCurrentQuestionMetadataRoute);

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
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  await ttsClient.close();
  console.log('All connections closed.');
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});