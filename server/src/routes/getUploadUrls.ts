import { Router, Request, Response } from "express";
import path from "path";
import { prisma } from "../index";
import { UploadUrlRequest } from "../../../shared/types";
import { Storage } from "@google-cloud/storage";

const router = Router();

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';
const bucket = storage.bucket(bucketName);

const getSignedUrl = async (req: Request, res: Response) => {
  try {
    const { 
      organizationId, 
      studyId, 
      questionId, 
      responseId, 
      fileExtension,
    }: UploadUrlRequest = req.body;

    const basePath = path.join(organizationId, studyId, questionId, responseId);
    const fileName = `recording.${fileExtension}`;
    const filePath = path.join(basePath, fileName);

    const [signedUrl] = await bucket.file(filePath).getSignedUrl({
      version: 'v4',
      action: 'resumable',
      expires: Date.now() + 15 * 60 * 1000, // URL expires in 15 minutes
      contentType: 'video/webm',
    });

    const existingResponse = await prisma.response.findUnique({
      where: { id: responseId },
      select: { fastTranscribedText: true }
    });

    if (!existingResponse) {
      return res.status(404).json({ error: 'Response not found' });
    }

    await prisma.responseMedia.create({
      data: {
        responseId: responseId,
        mediaUrl: `https://storage.googleapis.com/${bucketName}/${filePath}`,
        transcribedText: existingResponse.fastTranscribedText
      }
    });

    res.json({ signedUrl, path: filePath });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

router.post('/', getSignedUrl);

export const getSignedUrlRoute = router;