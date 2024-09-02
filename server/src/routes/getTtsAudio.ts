import { Router } from "express";
import { Request, Response } from "express";
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { createRequestLogger } from '../utils/logger';
// import { ttsClient } from "src";
const ttsClient = new TextToSpeechClient();

const router = Router();


const generateTtsAudio = async (
  text: string,
  requestLogger: ReturnType<typeof createRequestLogger>
) => {
  try {
    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { text },
      voice: { languageCode: 'en-US', name: "en-US-Journey-O" },
      audioConfig: {
        audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.LINEAR16,
        pitch: 0,
        speakingRate: 2
      },
    };

    requestLogger.info('Starting to generate TTS audio', { text });

    // Performs the text-to-speech request
    const [response] = await ttsClient.synthesizeSpeech(request);

    requestLogger.info('Finished generating TTS audio', { text });

    if (!response.audioContent) {
      throw new Error('No audio content received from Text-to-Speech API');
    }

    return response.audioContent;
  } catch (error) {
    requestLogger.error('Error generating TTS audio', { error: String(error) });
    throw error;
  }
};

const handleTtsAudioRequest = async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger();

  try {
    const { text } = req.body;

    if (!text) {
      requestLogger.warn('Missing required text field');
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioContent = await generateTtsAudio(text, requestLogger);

    res.set('Content-Type', 'audio/wav');
    res.set('Content-Disposition', 'attachment; filename="output.wav"');
    res.send(Buffer.from(audioContent));
  } catch (error) {
    requestLogger.error('Error processing TTS audio request', { error: String(error) });
    res.status(500).json({ error: 'Failed to generate audio', message: String(error) });
  }
};

router.post('/', handleTtsAudioRequest);

export const getTtsAudioRoute = router;