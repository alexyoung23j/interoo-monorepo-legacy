import * as functions from '@google-cloud/functions-framework';
import { GoogleAuth } from 'google-auth-library';
import axios, { AxiosResponse } from 'axios';

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

functions.http('setUpAnalysis', async (req: functions.Request, res: functions.Response) => {
  const { interviewSessionId } = req.body as RequestBody;

  if (!interviewSessionId) {
    res.status(400).send('Missing interviewSessionId in request body');
    return;
  }

  try {
    // Stub: Setup Supabase tables for future jobs
    console.log(`Setting up Supabase tables for interview session: ${interviewSessionId}`);
    // Your Supabase setup code would go here

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
  }
});