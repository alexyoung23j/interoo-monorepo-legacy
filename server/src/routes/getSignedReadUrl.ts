import { Router, Request, Response } from "express";
import { bucket } from "../index";
import { authMiddleware } from "../middleware/auth";

const router = Router();

interface SignedReadUrlRequest {
  filePath: string;
}

const getSignedReadUrl = async (req: Request<{}, {}, SignedReadUrlRequest>, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const [readUrl] = await bucket.file(filePath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // URL expires in 1 day
    });

    res.json({ readUrl });

  } catch (error) {
    console.error('Error generating read URL:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to generate read URL' });
  }
};

router.post('/', authMiddleware, getSignedReadUrl);

export const getSignedReadUrlRoute = router;