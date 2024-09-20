import { useState, useRef, useCallback, useEffect } from "react";
import { useAtomValue } from "jotai";
import { currentResponseAndUploadUrlAtom } from "@/app/state/atoms";
import { showWarningToast } from "@/app/utils/toastUtils";
import { getSupportedMimeType } from "@/app/utils/functions";

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
  const [isUploadComplete, setIsUploadComplete] = useState(true);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const uploadedSize = useRef<number>(0);
  const buffer = useRef<Blob>(
    new Blob([], { type: "video/webm;codecs=vp8,opus" }),
  );
  const totalSize = useRef<number>(0);
  const isUploading = useRef<boolean>(false);
  const uploadComplete = useRef<boolean>(false);
  const recordingTimeout = useRef<NodeJS.Timeout | null>(null);
  const cancelUpload = useRef<boolean>(false);
  const [isUploadingFinalChunks, setIsUploadingFinalChunks] = useState(false);

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
            buffer.current = buffer.current.slice(chunkSize);
          } else {
            setUploadProgress(100);
            uploadComplete.current = true;
            setIsUploadComplete(true);
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
      if (
        buffer.current.size >= CHUNK_SIZE &&
        !isUploading.current &&
        !uploadComplete.current
      ) {
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
        const mimeType = getSupportedMimeType(isVideoEnabled);
        uploadedSize.current = 0;
        totalSize.current = 0;
        buffer.current = new Blob([], {
          type: mimeType,
        });
        isUploading.current = false;
        uploadComplete.current = false;
        setIsUploadComplete(false);

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
              "Video recording stop process timed out after 18 seconds",
            );
            cancelUpload.current = true;
            setIsUploadComplete(true);
            reject(new Error("Recording stop process timed out"));
          }, 18000);

          const poorConnectionTimeoutId = setTimeout(() => {
            showWarningToast(
              "Your internet connection seems slow. Consider relocating for better upload speed.",
            );
          }, 8000);

          mediaRecorder.current.onstop = async () => {
            setIsRecording(false);
            console.log("Setting isUploadingFinalChunks to true");
            setIsUploadingFinalChunks(true); // Set to true when final upload starts
            console.log(
              "Recording stopped, waiting for any in-progress uploads to complete...",
            );

            // Wait for any in-progress uploads to complete
            while (isUploading.current && !cancelUpload.current) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            console.log("Uploading final chunks...");

            try {
              while (
                buffer.current.size > 0 &&
                !uploadComplete.current &&
                !cancelUpload.current
              ) {
                const uploadResult = await uploadNextChunk(true);
                if (uploadResult) break;
              }

              console.log("Final upload complete");
            } catch (error) {
              console.log("Error during final upload:", error);
              setError("Failed to upload all chunks. Please try again.");
            } finally {
              setIsUploadComplete(true);
              console.log("Setting isUploadingFinalChunks to false");
              setIsUploadingFinalChunks(false); // Set to false when final upload ends
            }

            // Reset states
            isUploading.current = false;
            buffer.current = new Blob([], { type: buffer.current.type });
            uploadedSize.current = 0;
            totalSize.current = 0;
            uploadComplete.current = false;
            cancelUpload.current = false;

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
    isUploadComplete,
    isUploadingFinalChunks, // Expose this state
  };
}
