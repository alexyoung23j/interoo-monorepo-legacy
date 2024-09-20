import { Router } from "express";
import { Request, Response } from "express";
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { createRequestLogger } from '../utils/logger';
import { elevenLabsClient, ttsClient } from "../index";
import { Readable } from "stream";
import { finished } from 'stream/promises';



const router = Router();

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const generateTtsAudio = async (
  text: string,
  ttsProvider: 'google' | 'elevenlabs',
  requestLogger: ReturnType<typeof createRequestLogger>
) => {
  try {
    requestLogger.info('Starting to generate TTS audio', { text, ttsProvider });

    let audioContent: Buffer;

    if (ttsProvider === 'google') {
      const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text },
        voice: { languageCode: 'en-US', name: "en-US-Journey-D" },
        audioConfig: {
          audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.LINEAR16,
        },
      };

      const [response] = await ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from Google Text-to-Speech API');
      }

      audioContent = Buffer.from(response.audioContent);
    } else if (ttsProvider === 'elevenlabs') {      
      const audioStream = await elevenLabsClient.generate({
        voice: "Chris",
        text: text,
        model_id: "eleven_turbo_v2"
      });
      
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
      
      const result = Buffer.concat(chunks);
      
      return result;
    } else {
      throw new Error('Invalid TTS provider specified');
    }

    requestLogger.info('Finished generating TTS audio', { text, ttsProvider });

    return audioContent;
  } catch (error) {
    requestLogger.error('Error generating TTS audio', { error: String(error), ttsProvider });
    throw error;
  }
};

const handleTtsAudioRequest = async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger();

  try {
    const { text, ttsProvider = 'google'} = req.body;
    
    if (!text) {
      requestLogger.warn('Missing required text field');
      return res.status(400).json({ error: 'Text is required' });
    }

    if (ttsProvider !== 'google' && ttsProvider !== 'elevenlabs') {
      requestLogger.warn('Invalid TTS provider specified');
      return res.status(400).json({ error: 'Invalid TTS provider' });
    }

    const audioContent = await generateTtsAudio(text, ttsProvider, requestLogger);

    res.set('Content-Type', 'audio/wav');
    res.set('Content-Disposition', 'attachment; filename="output.wav"');
    res.send(audioContent);
  } catch (error) {
    requestLogger.error('Error processing TTS audio request', { error: String(error) });
    res.status(500).json({ error: 'Failed to generate audio', message: String(error) });
  }
};

router.post('/', handleTtsAudioRequest);

export const getTtsAudioRoute = router;