import express from 'express';
import axios from 'axios';

const router = express.Router();

interface SmartLeadResponse {
  linkedin_profile: string;
  // Add other fields if needed
}

router.post('/', async (req, res) => {
  try {
    const { to_email } = req.body;

    if (!to_email) {
      return res.status(400).json({ error: 'to_email is required in the webhook payload' });
    }

    const smartLeadApiKey = process.env.SMARTLEAD_API_KEY;
    if (!smartLeadApiKey) {
      throw new Error('SMARTLEAD_API_KEY is not set in the environment variables');
    }

    const smartLeadUrl = `https://server.smartlead.ai/api/v1/leads/?api_key=${smartLeadApiKey}&email=${encodeURIComponent(to_email)}`;

    const response = await axios.get<SmartLeadResponse>(smartLeadUrl);

    const linkedinProfile = response.data.linkedin_profile ?? '';

    console.log('linkedinProfile', linkedinProfile);

    // Here you can do something with the linkedinProfile, such as storing it in a database

    res.status(200).json({ message: 'Webhook processed successfully', linkedinProfile });
  } catch (error) {
    console.error('Error processing SmartLead webhook:', error);
    res.status(500).json({ error: 'An error occurred while processing the webhook' });
  }
});

export const smartLeadWebhookRoute = router;