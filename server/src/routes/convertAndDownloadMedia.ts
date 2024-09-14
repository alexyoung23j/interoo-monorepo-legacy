import { Router, Request, Response } from "express";
import { prisma, bucket, bucketName } from "../index";
import { authMiddleware } from "../middleware/auth";
import { Readable } from 'stream';
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path as string;
const ffmpeg = require('fluent-ffmpeg') as any; // Type definition for fluent-ffmpeg is complex, using 'any' for simplicity

const router = Router();

const convertAndDownloadMedia = async (req: Request, res: Response) => {
  const { url, targetFormat, responseId, orgId, studyId, questionId } = req.body;

  if (!url || !targetFormat || !responseId || !orgId || !studyId || !questionId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Fetch the file from Google Cloud Storage
    const filePath = `${orgId}/${studyId}/${questionId}/${responseId}/recording`;
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType;

    // Need to pull out the format from the longer contentType name, see getSupportedMimeType()
    const fileFormat = contentType?.split('/')[1].split(';')[0] ?? 'webm';

    const [fileContent] = await file.download();

    // Set up the response headers
    res.setHeader('Content-Disposition', `attachment; filename="response_${responseId}.${targetFormat}"`);
    res.setHeader('Content-Type', 'video/mp4');

    // Create a readable stream from the file content
    const inputStream = Readable.from(fileContent);

    // Use ffmpeg to convert the file
    ffmpeg(inputStream)
      .inputFormat(fileFormat)
      .videoCodec('libx264')
      .audioCodec('aac')
      .toFormat('mp4')
      .outputOptions('-movflags frag_keyframe+empty_moov')
      .on('start', (commandLine: string) => {
        // console.log('FFmpeg process started:', commandLine);
      })
      .on('progress', (progress: { percent: number }) => {
        // console.log('Processing: ' + progress.percent + '% done');
      })
      .on('error', (err: Error, stdout: string, stderr: string) => {
        console.error('FFmpeg error:', err.message);
        console.error('FFmpeg stdout:', stdout);
        console.error('FFmpeg stderr:', stderr);
        res.status(500).json({ error: 'Conversion failed', details: err.message });
      })
      .on('end', () => {
        console.log('FFmpeg process completed');
      })
      .pipe(res, { end: true });

  } catch (error: unknown) {
    console.error('Error converting and downloading media:', error);
    res.status(500).json({ error: 'Failed to convert and download media', details: error instanceof Error ? error.message : String(error) });
  }
};

router.post('/', authMiddleware, convertAndDownloadMedia);

export const convertAndDownloadMediaRoute = router;