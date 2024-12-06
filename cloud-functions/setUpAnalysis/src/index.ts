import * as functions from '@google-cloud/functions-framework';
import { PrismaClient, Prisma } from '@prisma/client';
import { GoogleAuth } from 'google-auth-library';
import axios, { AxiosResponse } from 'axios';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Create a new GoogleAuth client
const auth = new GoogleAuth();

// The URL of your summarize-interview function
const targetAudience = `https://us-central1-interoo-${process.env.PROJECT ?? 'prod'}.cloudfunctions.net/summarizeInterview`;
const url = targetAudience;

interface RequestBody {
  interviewSessionId: string;
}

interface ResponseData {
  message: string;
}

export const setUpAnalysis: functions.HttpFunction = async (req, res) => {
  const { interviewSessionId } = req.body as RequestBody;

  if (!interviewSessionId) {
    res.status(400).send('Missing interviewSessionId in request body');
    return;
  }

  try {
    // Fetch the study and questions using Prisma
    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: interviewSessionId },
      include: {
        study: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!interviewSession) {
      throw new Error(`Interview session not found: ${interviewSessionId}`);
    }

    const { study } = interviewSession;

    // Create analysis job rows in a single transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const question of study.questions) {
        await tx.questionThemeAnalysisJob.create({
          data: {
            studyId: study.id,
            questionId: question.id,
            interviewSessionId: interviewSessionId,
            status: 'NOT_STARTED',
          }
        });

        await tx.questionAttributeAnalysisJob.create({
          data: {
            studyId: study.id,
            questionId: question.id,
            interviewSessionId: interviewSessionId,
            status: 'NOT_STARTED',
          }
        });
      }
    }, 
    {
      maxWait: 5000, // 5 seconds max wait to connect to prisma
      timeout: 60000, // 60 seconds in milliseconds
    });

    console.log(`Analysis jobs created for interview session: ${interviewSessionId}`);

    console.info(`Requesting ${url} with target audience ${targetAudience}`);
    const client = await auth.getIdTokenClient(targetAudience);

    // Get the ID token
    const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);

    // Call the summarizeInterview function
    const response: AxiosResponse<ResponseData> = await axios.post(
      url, 
      { interviewSessionId },
      { 
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    console.log('Response from summarizeInterview:', response.data);

    res.status(200).send(`Interview ${interviewSessionId} setup completed and summary triggered`);
  } catch (error) {
    console.error('Error in summarizeInterviewAndSetUpAnalysis:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    res.status(500).send(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await prisma.$disconnect();
  }
};