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
// async function getGoogleSheetsClient() {
//   // 0 fucks given

  
//   const client = new JWT({
//     email: credentials.client_email,
//     key: credentials.private_key,
//     scopes: ['https://www.googleapis.com/auth/spreadsheets'],
//   });

//   return google.sheets({ version: 'v4', auth: client });
// }

// Function to ensure a sheet exists, create if it doesn't
async function ensureSheetExists(sheets: any, spreadsheetId: string, sheetName: string) {
    try {
      await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [sheetName],
      });
    } catch (error) {
      console.log('Sheet doesn\'t exist, creating it');
      // Sheet doesn't exist, create it
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
    }
  }
  
  router.post('/', async (req, res) => {
    try {
      const { to_email, sequence_number, campaign_status, event_type, campaign_name, from_email, event_timestamp, to_name } = req.body;
  
      if (sequence_number > 1) {
        return res.status(200).json({ message: 'Ignoring, not a new lead' });
      }
  
      if (!to_email || !campaign_name || !event_timestamp) {
        return res.status(400).json({ error: 'to_email, campaign_name, and time_sent are required in the webhook payload' });
      }
  
      const smartLeadApiKey = process.env.SMARTLEAD_API_KEY;
      if (!smartLeadApiKey) {
        throw new Error('SMARTLEAD_API_KEY is not set in the environment variables');
      }
  
      const smartLeadUrl = `https://server.smartlead.ai/api/v1/leads/?api_key=${smartLeadApiKey}&email=${encodeURIComponent(to_email)}`;
  
      const response = await axios.get<SmartLeadResponse>(smartLeadUrl);
  
      const linkedinProfile = response.data.linkedin_profile ?? '';
      const companyUrl = response.data.company_url ?? '';
  
      // Write to Google Sheet
      const sheets = await getGoogleSheetsClient();
      const spreadsheetId = '1UUutW-Sf5-onhE4p0JxH7HtmI26nSbtp_27TLZnJ0BU';
      const sheetName = campaign_name;
  
      // Ensure the sheet exists
      await ensureSheetExists(sheets, spreadsheetId, sheetName);
  
      const range = `${sheetName}!A1`; 

      const message =  `Hey! Sent you an email the other day (from ${from_email}), wanted to try and get in touch here.`;
  
      const values = [
        ['not_connected', `${to_name}`, linkedinProfile, companyUrl, event_timestamp, message]
      ];
  
      const result = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
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