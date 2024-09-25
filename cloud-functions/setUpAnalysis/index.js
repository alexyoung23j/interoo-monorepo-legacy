const functions = require('@google-cloud/functions-framework');
const {GoogleAuth} = require('google-auth-library');
const axios = require('axios');

// Create a new GoogleAuth client
const auth = new GoogleAuth();

// The URL of your summarize-interview function
const targetAudience = 'https://us-central1-interoo-dev.cloudfunctions.net/summarize-interview';
const url = targetAudience;

functions.http('setUpAnalysis', async (req, res) => {
  const { interviewSessionId } = req.body;

  if (!interviewSessionId) {
    res.status(400).send('Missing interviewSessionId in request body');
    return;
  }

  const test = 'test';

  try {
    // Stub: Setup Supabase tables for future jobs
    console.log(`Setting up Supabase tables for interview session: ${interviewSessionId}`);
    // Your Supabase setup code would go here

    console.info(`Requesting ${url} with target audience ${targetAudience}`);
    const client = await auth.getIdTokenClient(targetAudience);

    // Get the ID token
    const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);

    // Call the summarizeInterview function
    const response = await axios.post(url, 
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
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});