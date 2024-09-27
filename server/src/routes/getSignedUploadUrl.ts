import { Router, Request, Response } from "express";
import { bucket } from "../index";

const router = Router();

interface SignedUrlRequest {
  filePath: string;
  contentType: string;
}

const getSignedUploadUrl = async (req: Request<{}, {}, SignedUrlRequest>, res: Response) => {
  try {
    const { filePath, contentType } = req.body;

    if (!filePath ?? !contentType) {
      return res.status(400).json({ error: 'filePath and contentType are required' });
    }

    const [uploadUrl] = await bucket.file(filePath).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // URL expires in 15 minutes
      contentType: contentType,
    });

    // Generate a long-lived signed URL for reading the file
    const [longLivedReadUrl] = await bucket.file(filePath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10, // URL expires in 10 years TODO: figure out how to do this properly
    });

    res.json({ uploadUrl, longLivedReadUrl });

  } catch (error) {
    console.error('Error generating URLs:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to generate URLs' });
  }
};

router.post('/', getSignedUploadUrl);

export const getSignedUploadUrlRoute = router;