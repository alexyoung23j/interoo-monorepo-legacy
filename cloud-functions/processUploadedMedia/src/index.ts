import * as functions from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path as string;
const ffmpeg = require('fluent-ffmpeg') as any;

const storage = new Storage();
const bucketName = process.env.BUCKET_NAME ?? '';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_KEY ?? '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

function logEntry(severity: string, message: string): void {
  const entry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(entry, null, 2));
}

interface RequestBody {
  responseId: string;
  fileName: string;
  contentType: string;
}

export const processUploadedMedia: functions.HttpFunction = async (req, res) => {
  try {
    const { responseId, fileName: realFileName, contentType: realFileContentType } = req.body as RequestBody;

    if (!responseId || !realFileName || !realFileContentType) {
      res.status(400).send('Missing required field: responseId or fileName');
      return;
    }

    logEntry('INFO', `Processing response media for responseId: ${responseId}, fileName: ${realFileName}`);

    // Fetch the response and its associated media
    const { data: response, error: responseError } = await supabase
      .from('Response')
      .select(`*,responseMedia:ResponseMedia(*)`)
      .eq('id', responseId)
      .single();


    if (responseError || !response?.responseMedia) {
      throw new Error(responseError?.message ?? 'No media found');
    }

    const { mediaUrl, contentType } = response.responseMedia[0];
    logEntry('INFO', `Found response media with URL: ${mediaUrl} and content type: ${contentType}`);

    // Ensure mediaUrl is not empty and is a valid path
    if (!mediaUrl) {
      throw new Error('Invalid media URL');
    }

    if (realFileName !== mediaUrl) {
      logEntry('INFO', `Note that the file name is different from the media URL. This happens when a no transcript recording is overwrriten. Original: ${realFileName}, Media URL: ${mediaUrl}`);
      // Add a 60 second delay to allow for file system sync
      logEntry('INFO', 'Waiting 60 seconds for file system sync...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      logEntry('INFO', 'Continuing after delay');
    }

    const bucket = storage.bucket(bucketName);
    
    // Remove any leading slashes to prevent empty file name errors
    const cleanMediaUrl = realFileName.replace(/^\/+/, '');
    const sourceFile = bucket.file(cleanMediaUrl);

    // Determine if it's audio or video based on content type
    const isAudio = realFileContentType.startsWith('audio/');
    const targetFormat = isAudio ? 'mp3' : 'mp4';
    
    // Generate the new file path while preserving the directory structure
    const pathParts = cleanMediaUrl.split('/');

    const directory = pathParts.slice(0, -1).join('/');
    const newMediaUrl = directory 
      ? `${directory}/recording-converted-${uuidv4()}.${targetFormat}`
      : `recording.${targetFormat}`;

    logEntry('INFO', `Generated new media path. Original: ${cleanMediaUrl}, New: ${newMediaUrl}, Format: ${targetFormat}`);

    const targetFile = bucket.file(newMediaUrl);

    // Download the source file
    logEntry('INFO', 'Downloading source file');
    const [fileContent] = await sourceFile.download();
    const inputStream = Readable.from(fileContent);
    logEntry('INFO', 'Source file downloaded successfully');

    // Get the input format from content type
    const fileFormat = realFileContentType.split('/')[1].split(';')[0] ?? 'webm';
    logEntry('INFO', `Determined input format: ${fileFormat}`);

    // Set up FFmpeg command
    const ffmpegCommand = ffmpeg(inputStream)
      .inputFormat(fileFormat)
      .outputOptions('-movflags frag_keyframe+empty_moov')
      .outputOptions('-preset faster')
      .outputOptions('-crf 23');

    if (isAudio) {
      ffmpegCommand
        .audioCodec('libmp3lame')
        .toFormat('mp3');
      logEntry('INFO', 'Configured FFmpeg for audio conversion');
    } else {
      ffmpegCommand
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .toFormat('mp4');
      logEntry('INFO', 'Configured FFmpeg for video conversion');
    }

    // Create a write stream to the new file
    const writeStream = targetFile.createWriteStream({
      metadata: {
        contentType: isAudio ? 'audio/mpeg' : 'video/mp4'
      }
    });

    // Process the conversion
    await new Promise((resolve, reject) => {
      ffmpegCommand
        .on('start', (commandLine: string) => {
          logEntry('INFO', `FFmpeg conversion started with command: ${commandLine}`);
        })
        .on('progress', (progress: { percent: number; frames: number; currentFps: number; currentKbps: number; targetSize: number; timemark: string }) => {
          logEntry('INFO', `FFmpeg conversion progress: ${progress.percent}% complete, ${progress.frames} frames at ${progress.currentFps} fps, ${progress.currentKbps} kbps, size: ${progress.targetSize}, time: ${progress.timemark}`);
        })
        .on('error', (err: Error, stdout: string, stderr: string) => {
          logEntry('ERROR', `FFmpeg conversion error: ${err.message}\nStdout: ${stdout}\nStderr: ${stderr}`);
          reject(err);
        })
        .on('end', () => {
          logEntry('INFO', 'FFmpeg conversion completed successfully');
          resolve(null);
        })
        .pipe(writeStream);
    });

    logEntry('INFO', `Updating ResponseMedia record with new URL: ${newMediaUrl} and content type: ${isAudio ? 'audio/mpeg' : 'video/mp4'}`);

    const { error: updateError } = await supabase
      .from('ResponseMedia')
      .update({
        mediaUrl: newMediaUrl,
        contentType: isAudio ? 'audio/mpeg' : 'video/mp4'
      })
      .eq('responseId', responseId);

    if (updateError) {
      throw updateError;
    }

    logEntry('INFO', 'ResponseMedia record updated successfully');
    res.status(200).send(`Successfully processed media for response: ${responseId}`);
  } catch (error) {
    logEntry('ERROR', `Error processing media: ${error instanceof Error ? error.message : 'Unknown error'}\n${error instanceof Error ? error.stack : ''}`);
    res.status(500).send(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};