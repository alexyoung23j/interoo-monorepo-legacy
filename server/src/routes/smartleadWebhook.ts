import express from 'express';
import axios from 'axios';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const router = express.Router();

interface SmartLeadResponse {
  linkedin_profile: string;
  first_name: string;
  last_name: string;
  company_url: string;
  // Add other fields if needed
}

// Function to initialize Google Sheets client
async function getGoogleSheetsClient() {
  const credentials = require('../smartlead_service_account_credentials.json');
  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth: client });
}

// NOTE: THIS ONLY SUPPOSED TO WORK ON STAGING
router.post('/', async (req, res) => {
  try {
    const { to_email, sequence_number, campaign_status, event_type, campaign_name } = req.body;
    console.log('req.body', req.body);

    if (sequence_number > 1) {
      return res.status(200).json({ message: 'Ignoring, not a new lead' });
    }

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
    const firstName = response.data.first_name ?? '';
    const lastName = response.data.last_name ?? '';
    const companyUrl = response.data.company_url ?? '';

    // Write to Google Sheet
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = '1UUutW-Sf5-onhE4p0JxH7HtmI26nSbtp_27TLZnJ0BU';
    const range = 'Sheet1!A:D'; // Adjust this to match your sheet name and range

    const values = [
      ['', `${firstName} ${lastName}`, linkedinProfile, companyUrl]
    ];

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    console.log('Data appended to Google Sheet:', result.data);

    res.status(200).json({ message: 'Webhook processed successfully and data added to Google Sheet', linkedinProfile });
  } catch (error) {
    console.error('Error processing SmartLead webhook:', error);
    res.status(500).json({ error: 'An error occurred while processing the webhook' });
  }
});

export const smartLeadWebhookRoute = router;