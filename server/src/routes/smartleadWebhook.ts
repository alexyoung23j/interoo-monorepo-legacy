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
  // 0 fucks given
  const credentials = {
    "type": "service_account",
    "project_id": "interoo-staging",
    "private_key_id": "6529b3752b9712716284af56352a17c2dac69f2e",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+oE7Izn9wc6KJ\nb59EBe0Y0K6CvZddIQmE5UWb9rM/2XzDPEY5/t872Vw5mWb/GJrDDkd+4Kf71IOV\naGj9/LT0oIHJgzdPBmhtv93rMg1J1M4LangcCSGIPwi5KhdPsErdjQujDc4Pjsbn\nOfsJ3sVlnu500nunlx3saqFLs0rEo2JaLRRJZGlVc/llxRX+vEAbc/Y22OAvik8C\n9MpfCPeq43iicMLHta4lZTFRKWadhz7k+rHFabqOLuKyk0Tf6wH2POh1Dg4Hy5yB\nhU3GM7F1Xv1oq07hbykpjjyciCfDiloWwLas08YhOPnfxV+PPn3LLo9dVS2V34G5\nSWUuM6RjAgMBAAECggEAIWnZFXK4vN3QBjYmHRbK1fgyNqGD6COT1xMXDf0Cs3Ts\nXQ5yItVNjOCPPVtpxdoqunkEyDUZzNcVz3kTOj3y/BQsW8Wfyr7NTDt+6yyFTsU5\n7p9VeViSY57k6Qv7NREqNkZ0XTrcvTZiIAK2QacmQ6dFlf2VBi3DZX7VUf8V4nyR\nFWww6thL68sHO5UJcUmimkhnS+lfBmk6H633z985hDQRjmxV2y+CBf6UvD5uw0GS\n0U3LQ11PAEwi9ffcVYcAiYUyEHmY/Q+JgsHxKJSx5WY5mi/b8TZrnuuO1WMQZvmD\nrcMRD5tK3edO8LlhX84oGNzloOlzZqJbRvzeH57HwQKBgQD4Xql1YsNSRfygGZEf\nJFOelwHWl4Mcr/yBwjq+8Np38lYkRTZ9KPB7fzrXPOYZxcC5m7p5uTN4i+sA+hNv\nMYkv3PuRLKrWvRfaxq1+FdnJ6R6tvJcQc1WIoEBduIP2VXFm9z0vRo1Xzu7Epfrm\n/N8VeXlS8ATYJ7kBXS3OQ5Z0QQKBgQDEe4N6uzxEMmYzKliOS6BbdHHo+OrXWRWP\n0J6Zyoe99vtbPUMXMyt1oHr8QG2ekbnWutAt3CFYpex/Aa0qvvGO4AtR612wqf4e\n2knQAvFpAtD8asMoHCZVU+Tbj2+C+0Ok/x3vY5fREs6QA7V/nvDXmW7CdwdBAQxI\n843U4WPfowKBgGlzP31wVj9rKYwL7tqLANm3gXdL0sXuTkYFYg3JkugUQtCZdj4D\nkL7OUPwrhgJxPJdRcAXYROssdLVwd6nhHT7uEv0bOtl7ZVJkwipjOpmIWZcoF/dL\nEIi2iT2BZr3Cnyg5Vofo63/ZgvSJCBLkUA79CS7WaygfDWRv3E/T0GBBAoGBAL6R\nPXiwWUebylwd2j5JQ4LwcfsQUlYD5VHTecCYGwg4oJph1MyPqLsxp5c5thhyJtkJ\n4BhaxU0BwVt9+MLY59k3nEMcEYbjmcG63pSOBi9ft+raceZZRyTDddkuSW203msN\nta8V3Y2+u/IaZtMdCWNTQYYDhFmb9ppa/1lWMlQZAoGAcpAudzkaCFC2jMgHy6lq\nuTKXCmrQJTY2Tkqr53QmnDVMLEHXqhc06Uyj2jA53zBscqwsJNAJuc2lbgJUTmht\nHna0coJxGzU350G8005gW9+1Qiio3/rdaM/NhN2yvbHtYeb1XlvwXzLjUhqLrJLk\neW+B+eANem1bTD53mgqehVw=\n-----END PRIVATE KEY-----\n",
    "client_email": "google-sheets-service-account@interoo-staging.iam.gserviceaccount.com",
    "client_id": "113087175492960558420",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/google-sheets-service-account%40interoo-staging.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  };
  
  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth: client });
}

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
      const { to_email, sequence_number, campaign_status, event_type, campaign_name, from_email, event_timestamp } = req.body;
      console.log('req.body', req.body);
  
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
      const firstName = response.data.first_name ?? '';
      const lastName = response.data.last_name ?? '';
      const companyUrl = response.data.company_url ?? '';
  
      // Write to Google Sheet
      const sheets = await getGoogleSheetsClient();
      const spreadsheetId = '1UUutW-Sf5-onhE4p0JxH7HtmI26nSbtp_27TLZnJ0BU';
      const sheetName = campaign_name;
  
      // Ensure the sheet exists
      await ensureSheetExists(sheets, spreadsheetId, sheetName);
  
      const range = `${sheetName}!A:E`; // Adjusted to include the new time_sent column
  
      const values = [
        ['', `${firstName} ${lastName}`, linkedinProfile, companyUrl, event_timestamp]
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