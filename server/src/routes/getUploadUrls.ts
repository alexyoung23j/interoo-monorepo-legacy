import { Router, Request, Response } from "express";
import path from "path";
import { prisma, supabase } from "../index";
import { UploadUrlRequest } from "../../../shared/types";

const router = Router();

const getSignedUrl = async (req: Request, res: Response) => {
  try {
    const { 
      organizationId, 
      studyId, 
      questionId, 
      responseId, 
      fileExtension,
    }: UploadUrlRequest = req.body;

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'assets';

    const basePath = path.join(organizationId, studyId, questionId, responseId);
    const fileName = `recording.${fileExtension}`;
    const filePath = path.join(basePath, fileName);

    const signedUrl = await generateSignedUrl(bucketName, filePath);

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
        mediaUrl: signedUrl.path,
        transcribedText: existingResponse.fastTranscribedText
      }
    });

    res.json(signedUrl);

  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

async function generateSignedUrl(bucketName: string, filePath: string) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUploadUrl(filePath);

  if (error) {
    throw error;
  }

  return {
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token
  };
}

router.post('/', getSignedUrl);

export const getSignedUrlRoute = router;