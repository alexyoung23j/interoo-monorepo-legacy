import { Router, Request, Response } from "express";
import { prisma, bucket, bucketName } from "../index";
import { authMiddleware } from "src/middleware/auth";

const router = Router();

const getMediaSignedUrl = async (req: Request, res: Response) => {
  const { responseId } = req.params;

  try {
    const responseMedia = await prisma.responseMedia.findUnique({
      where: { responseId },
    });

    if (!responseMedia) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const signedUrl = async (filePath: string, contentType: string) => {
        const file = bucket.file(filePath);
        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // URL expires in 60 minutes
        });
        return signedUrl;
      };
    res.json({ signedUrl, contentType: responseMedia.contentType });
  } catch (error) {
    console.error('Error retrieving media signed URL:', error);
    res.status(500).json({ error: 'Failed to retrieve media signed URL' });
  }
};

router.get('/:responseId', authMiddleware, getMediaSignedUrl);

export const getMediaSignedUrlRoute = router;