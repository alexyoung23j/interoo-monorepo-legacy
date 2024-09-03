import { Router, Request, Response } from "express";
import path from "path";
import { bucket, bucketName, prisma } from "../index";
import { UploadUrlRequest } from "../../../shared/types";
import axios from "axios";

const router = Router();

const getSignedUrl = async (req: Request, res: Response) => {
  try {
    const { 
      organizationId, 
      studyId, 
      questionId, 
      interviewSessionId, // Changed from responseId
      fileExtension,
      contentType
    }: UploadUrlRequest = req.body;

    // Create a new response
    const newResponse = await prisma.response.create({
      data: {
        questionId: questionId,
        interviewSessionId: interviewSessionId,
        fastTranscribedText: "",
      }
    });

    const responseId = newResponse.id;
    const basePath = path.join(organizationId, studyId, questionId, responseId);
    const fileName = `recording.${fileExtension}`;
    const filePath = path.join(basePath, fileName);

    const [signedUrl] = await bucket.file(filePath).getSignedUrl({
      version: 'v4',
      action: 'resumable',
      expires: Date.now() + 30 * 60 * 1000, // URL expires in 30 minutes
      contentType: contentType,
    });

    // Initiate the resumable upload session
    const response = await axios.post(signedUrl, null, {
      headers: {
        'Content-Type': contentType,
        'X-Goog-Resumable': 'start',
        'Origin': process.env.FRONTEND_URL
      }
    });

    const sessionUrl = response.headers['location'];

    if (!sessionUrl) {
      throw new Error('Failed to get session URL');
    }

    await prisma.responseMedia.create({
      data: {
        responseId: responseId,
        mediaUrl: `https://storage.googleapis.com/${bucketName}/${filePath}`,
        transcribedText: "" // Initialize with empty string
      }
    });

    res.json({ sessionUrl, path: filePath, newResponse });

  } catch (error) {
    console.error('Error generating upload session URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

router.post('/', getSignedUrl);

export const getSignedUrlRoute = router;