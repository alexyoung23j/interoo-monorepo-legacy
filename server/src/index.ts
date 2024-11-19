import express from "express";
import { PrismaClient } from "@shared/generated/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { Storage } from "@google-cloud/storage";
import { createClient as createDeepgramClient } from "@deepgram/sdk";
import { ElevenLabsClient } from "elevenlabs";
import { GoogleAuth } from "google-auth-library";

// Import routes
import { audioResponseRoute, triggerAnalysisJobsSetup } from "./routes/audioResponse";
import { getTtsAudioRoute } from "./routes/getTtsAudio";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { getCurrentQuestionMetadataRoute } from "./routes/getCurrentQuestionMetadata";
import { getMediaSignedUrlRoute } from "./routes/getSignedUrlForMediaView";
import { convertAndDownloadMediaRoute } from "./routes/convertAndDownloadMedia";
import { createStudyDataExportRoute } from "./routes/createStudyDataExport";
import { getSignedUploadUrlRoute } from "./routes/getSignedUploadUrl";
import { getSignedReadUrlRoute } from "./routes/getSignedReadUrl";
import { resetStudyThemesRoute } from './routes/resetStudyThemes';
import { createInterviewTranscriptExportRoute } from "./routes/createInterviewTranscriptExport";
import { smartLeadWebhookRoute } from "./routes/smartleadWebhook";

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

// Initialize ElevenLabs client
export const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});
export const bucketName = process.env.GCS_BUCKET_NAME || 'idi-assets';
export const bucket = storage.bucket(bucketName);

// Create and export a GoogleAuth instance for Google Cloud Functions
export const googleCredentials = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_STORAGE_EMAIL,
    private_key: (process.env.GOOGLE_STORAGE_PRIVATE_KEY as string).replace(/\\n/gm, "\n")
  }
};
export const googleAuth = new GoogleAuth(googleCredentials);

// Middleware to add API key to requests
app.use((req, res, next) => {
  req.headers['x-goog-api-key'] = process.env.GOOGLE_CLOUD_API_KEY;
  next();
});

// Add this before your CORS middleware
app.use((req, res, next) => {
  console.log('Incoming request from origin:', req.headers.origin);
  next();
});

app.use(cors({ 
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL as string,
      'https://*.ngrok-free.app'
    ];
    
    // Check if origin matches any of our patterns
    const isAllowed = allowedOrigins.some(pattern => {
      if (pattern.includes('*')) {
        const regexPattern = pattern.replace('*', '.*');
        return new RegExp(regexPattern).test(origin ?? '');
      }
      return origin === pattern;
    });

    if (!origin || isAllowed) {
      callback(null, true);
    } else {
      console.log('Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-goog-api-key', 'ngrok-skip-browser-warning'],
}));

app.use(express.json());

// Routes
app.use("/api/audio-response", audioResponseRoute);
app.use("/api/get-tts-audio", getTtsAudioRoute);
app.use("/api/get-current-question-metadata", getCurrentQuestionMetadataRoute);
app.use("/api/get-signed-urls-for-media-view", getMediaSignedUrlRoute);
app.use("/api/convert-and-download", convertAndDownloadMediaRoute);
app.use("/api/create-study-data-export", createStudyDataExportRoute);
app.use("/api/get-signed-upload-url", getSignedUploadUrlRoute);
app.use("/api/getSignedReadUrl", getSignedReadUrlRoute);
app.use("/api/reset-study-themes", resetStudyThemesRoute);
app.use("/api/create-interview-transcript-export", createInterviewTranscriptExportRoute);
app.use('/api/webhook/smartlead', smartLeadWebhookRoute);

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
