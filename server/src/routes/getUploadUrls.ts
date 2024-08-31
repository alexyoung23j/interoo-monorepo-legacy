import { Router, Request, Response } from "express";
import path from "path";
import { prisma, supabase } from "../index";
import { UploadUrlRequest } from "../../../shared/types";

const router = Router();

const getUploadUrls = async (req: Request, res: Response) => {
  try {
    const { 
      organizationId, 
      studyId, 
      questionId, 
      responseId, 
      audio, 
      video 
    }: UploadUrlRequest = req.body;

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'assets';

    // Generate base path
    const basePath = path.join(organizationId, studyId, questionId, responseId);

    // Generate signed URL for audio
    const audioFileName = `audio.${audio.fileExtension}`;
    const audioFilePath = path.join(basePath, audioFileName);
    const audioSignedUrl = await generateSignedUrl(bucketName, audioFilePath);

    let videoSignedUrl = null;
    if (video) {
      // Generate signed URL for video if requested
      const videoFileName = `video.${video.fileExtension}`;
      const videoFilePath = path.join(basePath, videoFileName);
      videoSignedUrl = await generateSignedUrl(bucketName, videoFilePath);
    }

    // Fetch the existing Response
    const existingResponse = await prisma.response.findUnique({
      where: { id: responseId },
      select: { fastTranscribedText: true }
    });

    if (!existingResponse) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Create ResponseMedia
    const responseMedia = await prisma.responseMedia.create({
      data: {
        responseId: responseId,
        audioBucketUrl: audioSignedUrl.path,
        videoBucketUrl: videoSignedUrl ? videoSignedUrl.path : null,
        transcribedText: existingResponse.fastTranscribedText
      }
    });

    // Return signed URLs
    res.json({
      audio: audioSignedUrl,
      video: videoSignedUrl
    });

  } catch (error) {
    console.error('Error generating signed URLs:', error);
    res.status(500).json({ error: 'Failed to generate upload URLs' });
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

router.post('/', getUploadUrls); // TODO: this shouldnt be authed right?

export const getUploadUrlsRoute = router;