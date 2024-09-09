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

      console.log("uploadNextChunk called", {
        uploadSessionUrl: uploadUrl,
        bufferSize: buffer.current.size,
        isUploading: isUploading.current,
        uploadComplete: uploadComplete.current,
      });

      if (
        !uploadUrl ||
        buffer.current.size === 0 ||
        isUploading.current ||
        uploadComplete.current
      ) {
        console.log("uploadNextChunk returning early", {
          reason: !uploadUrl
            ? "No upload URL"
            : buffer.current.size === 0
              ? "Empty buffer"
              : isUploading.current
                ? "Already uploading"
                : "Upload complete",
        });
        return;
      }

      isUploading.current = true;
      const chunkSize = Math.min(CHUNK_SIZE, buffer.current.size);
      const chunk = buffer.current.slice(0, chunkSize);

      const start = uploadedSize.current;
      const end = start + chunk.size - 1;
      const total = isLastChunk ? totalSize.current.toString() : "*";

      try {
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
    if (recordingTimeout.current) {
      clearTimeout(recordingTimeout.current);
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      return new Promise<void>((resolve, reject) => {
        if (mediaRecorder.current) {
          const timeoutId = setTimeout(() => {
            console.log(
              "Video recording timed out after 7 seconds. Recording lost.",
            );
            setError("Recording timed out. Please try again.");
            reject(new Error("Recording timed out"));
          }, UPLOAD_TIMEOUT);

          mediaRecorder.current.onstop = async () => {
            setIsRecording(false);
            console.log("Recording stopped, uploading final chunks...");

            let retryCount = 0;
            const maxRetries = 5;

            try {
              while (buffer.current.size > 0 && !uploadComplete.current) {
                try {
                  const uploadResult = await uploadNextChunk(true);
                  if (uploadResult) {
                    break; // Upload is complete
                  }
                  // If uploadResult is false, continue uploading next chunk
                } catch (error) {
                  console.error("Error uploading chunk:", error);
                  retryCount++;
                  if (retryCount >= maxRetries) {
                    console.error(
                      "Max retries reached. Upload may be incomplete.",
                    );
                    setError("Failed to upload all chunks. Please try again.");
                    throw error;
                  }
                  console.log(`Retry attempt ${retryCount} of ${maxRetries}`);
                  await new Promise((r) => setTimeout(r, 1000)); // Wait 1 second before retrying
                }
              }

              if (uploadComplete.current) {
                console.log("All chunks uploaded successfully.");
              }

              clearTimeout(timeoutId);
              resolve();
            } catch (error) {
              clearTimeout(timeoutId);
              reject(new Error(String(error)));
            }
          };
          mediaRecorder.current.stop();
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
