import { Router, Request, Response } from "express";
import Busboy from 'busboy';
import { transcribeAudio } from "../../utils/audioProcessing";
import { createRequestLogger } from "../../utils/logger";

const router = Router();

const testTranscribe = (req: Request, res: Response) => {
  const busboy = Busboy({ headers: req.headers });
  let audioBuffer: Buffer | null = null;

  busboy.on('file', (fieldname, file, filename) => {
    if (fieldname === 'audio') {
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => audioBuffer = Buffer.concat(chunks));
    }
  });

  busboy.on('finish', async () => {
    if (!audioBuffer) return res.status(400).json({ error: 'No audio file provided' });
    try {
      const transcribedText = await transcribeAudio(audioBuffer, createRequestLogger());
      res.json({ transcribedText });
    } catch (error) {
      console.error('Error transcribing audio:', error);
      res.status(500).json({ error: 'Failed to transcribe audio' });
    }
  });

  req.pipe(busboy);
};

router.post("/", testTranscribe);

export const testTranscribeRoute = router;