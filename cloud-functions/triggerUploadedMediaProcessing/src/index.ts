import * as path from 'path';
import { GoogleAuth } from 'google-auth-library';

// Helper function for structured logging
function logEntry(severity: string, message: string, additionalFields: Record<string, any> = {}): void {
  const entry = {
    severity,
    message,
    ...additionalFields
  };
  console.log(JSON.stringify(entry));
}

interface GCSEvent {
  bucket: string;
  name: string;
  contentType?: string;
  metageneration: string;
  timeCreated: string;
  updated: string;
}

export const triggerUploadedMediaProcessing = async (event: GCSEvent, context: any): Promise<void> => {
  try {
    logEntry('INFO', 'Processing new file upload', {
      bucket: event.bucket,
      file: event.name,
      contentType: event.contentType
    });

    // Only process webm files
    if (!event.contentType?.includes('webm')) {
      logEntry('INFO', 'Skipping non-webm file', {
        contentType: event.contentType
      });
      return;
    }

    // Extract response ID from the file path
    const pathParts = event.name.split('/');
    if (pathParts.length < 4) {
      throw new Error('Invalid file path structure');
    }

    const responseId = pathParts[pathParts.length - 2]; // Get second to last segment
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID ?? '';
    const region = 'us-central1';

    if (!projectId) {
      throw new Error('Google Cloud Project ID not configured');
    }

    // Construct the target URL for the processUploadedMedia function
    const targetUrl = `https://${region}-${projectId}.cloudfunctions.net/processUploadedMedia`;

    // Create an auth client using Google Auth Library
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(targetUrl);

    // Make the authenticated request
    const response = await client.request({
      url: targetUrl,
      method: 'POST',
      data: { responseId, fileName: event.name, contentType: event.contentType }
    });

    logEntry('INFO', 'Successfully triggered processing', {
      responseId,
      targetUrl,
      status: response.status
    });

  } catch (error) {
    logEntry('ERROR', 'Error processing uploaded media', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } 
};