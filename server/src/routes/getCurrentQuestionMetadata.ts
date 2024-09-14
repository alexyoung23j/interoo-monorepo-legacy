import { Router, Request, Response } from "express";
import path from "path";
import { bucket, bucketName, prisma } from "../index";
import { CurrentQuestionMetadataRequest } from "../../../shared/types";
import axios from "axios";

const router = Router();

const getCurrentQuestionMetadata = async (req: Request, res: Response) => {
  try {
    const { 
      organizationId, 
      studyId, 
      questionId, 
      interviewSessionId,
      followUpQuestionId,
      contentType
    }: CurrentQuestionMetadataRequest = req.body;

    // Create a new response with default values
    const newResponse = await prisma.response.create({
      data: {
        questionId: questionId,
        interviewSessionId: interviewSessionId,
        followUpQuestionId: followUpQuestionId,
        fastTranscribedText: "",
      }
    });

    const responseId = newResponse.id;
    const basePath = path.join(organizationId, studyId, questionId, responseId);
    const fileName = 'recording';
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

    console.log({contentType})

    await prisma.responseMedia.create({
      data: {
        responseId: responseId,
        mediaUrl: `https://storage.googleapis.com/${bucketName}/${filePath}`,
        transcribedText: "", // Initialize with empty string
        contentType: contentType  
      }
    });

    res.json({ sessionUrl, path: filePath, newResponse });

  } catch (error) {
    console.error('Error generating metadata and upload session URL:', error);
    res.status(500).json({ error: 'Failed to generate metadata and upload URL' });
  }
};

router.post('/', getCurrentQuestionMetadata);

export const getCurrentQuestionMetadataRoute = router;