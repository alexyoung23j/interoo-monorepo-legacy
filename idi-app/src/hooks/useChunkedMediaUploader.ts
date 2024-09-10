import { useState, useRef, useCallback, useEffect } from "react";
import { useAtomValue } from "jotai";
import { currentResponseAndUploadUrlAtom } from "@/app/state/atoms";
import { showWarningToast } from "@/app/utils/toastUtils";

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MiB
const UPLOAD_TIMEOUT = 7000; // 7 seconds in milliseconds
const MAX_RECORDING_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

export function useChunkedMediaUploader() {
  const currentResponseAndUploadUrl = useAtomValue(
    currentResponseAndUploadUrlAtom,
  );

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const uploadedSize = useRef<number>(0);
  const buffer = useRef<Blob>(
    new Blob([], { type: "video/webm;codecs=vp8,opus" }),
  );
  const totalSize = useRef<number>(0);
  const isUploading = useRef<boolean>(false);
  const uploadComplete = useRef<boolean>(false);
  const recordingTimeout = useRef<NodeJS.Timeout | null>(null);

  const uploadNextChunk = useCallback(
    async (isLastChunk = false) => {
      const uploadUrl = currentResponseAndUploadUrl.uploadSessionUrl;

      if (
        !uploadUrl ||
        buffer.current.size === 0 ||
        isUploading.current ||
        uploadComplete.current
      ) {
        const reason = !uploadUrl
          ? "No upload URL"
          : buffer.current.size === 0
            ? "Empty buffer"
            : uploadComplete.current
              ? "Upload complete"
              : null; // This corresponds to "Already uploading"

        if (reason) {
          console.log("uploadNextChunk returning early", { reason });
        }
        return;
      }

      try {
        isUploading.current = true;
        const chunkSize = Math.min(CHUNK_SIZE, buffer.current.size);
        const chunk = buffer.current.slice(0, chunkSize);

        const start = uploadedSize.current;
        const end = start + chunk.size - 1;
        const total = isLastChunk ? totalSize.current.toString() : "*";

        console.log(`Uploading chunk: bytes ${start}-${end}/${total}`);
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Range": `bytes ${start}-${end}/${total}`,
          },
          body: chunk,
        });

        if (
          response.status === 308 ||
          response.status === 200 ||
          response.status === 201
        ) {
          const range = response.headers.get("Range");
          if (range) {
            const [, serverEnd] = range.split("-").map(Number);
            if (serverEnd !== undefined) {
              uploadedSize.current = serverEnd + 1;
            }
          }

          if (response.status === 308) {
            console.log(
              `Partial upload successful, uploaded to byte ${uploadedSize.current}`,
            );
            buffer.current = buffer.current.slice(chunkSize);
          } else {
            console.log("Upload completed");
            setUploadProgress(100);
            uploadComplete.current = true;
            return true;
          }

          setUploadProgress((uploadedSize.current / totalSize.current) * 100);
          return false; // Indicate that upload should continue
        } else {
          throw new Error(`Unexpected response: ${response.status}`);
        }
      } catch (error) {
        console.error("Chunk upload failed:", error);
        setError("Failed to upload media chunk. Please try again.");
        throw error; // Re-throw the error instead of returning null
      } finally {
        isUploading.current = false;
      }
    },
    [currentResponseAndUploadUrl, buffer, isUploading, uploadComplete],
  );

  const addChunkToBuffer = useCallback(
    (chunk: Blob) => {
      buffer.current = new Blob([buffer.current, chunk], {
        type: buffer.current.type,
      });
      totalSize.current += chunk.size;
      console.log(
        `Added chunk to buffer. Total size: ${totalSize.current} bytes, Buffer size: ${buffer.current.size} bytes`,
      );

      if (
        buffer.current.size >= CHUNK_SIZE &&
        !isUploading.current &&
        !uploadComplete.current
      ) {
        console.log("Buffer size reached threshold, triggering upload");
        void uploadNextChunk();
      }
    },
    [uploadNextChunk],
  ); // Explicit dependency on uploadNextChunk just in case

  const startRecording = useCallback(
    async (isVideoEnabled: boolean) => {
      if (!currentResponseAndUploadUrl.uploadSessionUrl) {
        throw new Error("No upload session URL available");
      }

      try {
        uploadedSize.current = 0;
        totalSize.current = 0;
        buffer.current = new Blob([], {
          type: isVideoEnabled
            ? "video/webm;codecs=vp8,opus"
            : "audio/webm;codecs=opus",
        });
        isUploading.current = false;
        uploadComplete.current = false;

        const mimeType = isVideoEnabled
          ? "video/webm;codecs=vp8,opus"
          : "audio/webm;codecs=opus";
        buffer.current = new Blob([], { type: mimeType });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled,
          audio: true,
        });
        mediaRecorder.current = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: isVideoEnabled ? 2500000 : undefined,
          audioBitsPerSecond: 128000,
        });

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            addChunkToBuffer(event.data);
          }
        };

        setIsRecording(true);
        mediaRecorder.current.start(500);

        // Set timeout to stop recording after 10 minutes
        recordingTimeout.current = setTimeout(() => {
          void stopRecording();
          showWarningToast("Recording time limit reached (10 minutes).");
        }, MAX_RECORDING_TIME);
      } catch (err) {
        console.error("Error starting recording:", err);
        setError("Failed to start recording. Please check your permissions.");
      }
    },
    [currentResponseAndUploadUrl, addChunkToBuffer],
  );

  const stopRecording = useCallback(async () => {
    console.debug("Stopping recording");
    if (recordingTimeout.current) {
      clearTimeout(recordingTimeout.current);
    }

    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      return new Promise<void>((resolve, reject) => {
        if (mediaRecorder.current) {
          const timeoutId = setTimeout(() => {
            console.debug(
              "Video recording stop process timed out after 18 seconds",
            );
            reject(new Error("Recording stop process timed out"));
          }, 18000);

          const poorConnectionTimeoutId = setTimeout(() => {
            showWarningToast(
              "Your internet connection seems slow. Consider relocating for better upload speed.",
            );
          }, 8000);

          mediaRecorder.current.onstop = async () => {
            setIsRecording(false);
            console.debug(
              "Recording stopped, waiting for any in-progress uploads to complete...",
            );

            // Wait for any in-progress uploads to complete
            while (isUploading.current) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            console.debug("Uploading final chunks...");

            try {
              while (buffer.current.size > 0 && !uploadComplete.current) {
                const uploadResult = await uploadNextChunk(true);
                if (uploadResult) break;
              }

              console.debug("Final upload complete");
            } catch (error) {
              console.debug("Error during final upload:", error);
              setError("Failed to upload all chunks. Please try again.");
            }

            // Reset states
            isUploading.current = false;
            buffer.current = new Blob([], { type: buffer.current.type });
            uploadedSize.current = 0;
            totalSize.current = 0;
            uploadComplete.current = false;

            clearTimeout(timeoutId);
            clearTimeout(poorConnectionTimeoutId);
            resolve();
          };

          mediaRecorder.current.stop();
          console.debug("Requested media recorder to stop");
        } else {
          resolve();
        }
      });
    }
  }, [uploadNextChunk]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    uploadProgress,
  };
}
