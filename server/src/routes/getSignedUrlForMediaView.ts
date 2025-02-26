import { Router, Request, Response } from "express";
import { prisma, bucket } from "../index";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const getMediaSignedUrls = async (req: Request, res: Response) => {
  const { responseIds } = req.body;

  if (!Array.isArray(responseIds)) {
    return res.status(400).json({ error: 'responseIds must be an array' });
  }

  try {
    const responseMedias = await prisma.responseMedia.findMany({
      where: { responseId: { in: responseIds } },
    });

    const signedUrlMap: Record<string, { signedUrl: string; contentType: string }> = {};

    for (const media of responseMedias) {
      const file = bucket.file(media.mediaUrl);
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // URL expires in 60 minutes
      });
      signedUrlMap[media.responseId] = {
        signedUrl,
        contentType: media.contentType
      };
    }

    res.json({ signedUrls: signedUrlMap });
  } catch (error) {
    console.error('Error retrieving media signed URLs:', error);
    res.status(500).json({ error: 'Failed to retrieve media signed URLs' });
  }
};

router.post('/batch', authMiddleware, getMediaSignedUrls);

export const getMediaSignedUrlRoute = router;