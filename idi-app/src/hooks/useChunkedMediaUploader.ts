import { useState, useRef, useCallback } from "react";
import { useAtomValue } from "jotai";
import { currentResponseAndUploadUrlAtom } from "@/app/state/atoms";
import { showWarningToast } from "@/app/utils/toastUtils";
import { getSupportedMimeType } from "@/app/utils/functions";
import * as Sentry from "@sentry/nextjs";

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
  const uploadStartTime = useRef<number | null>(null);

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
          Sentry.captureMessage(`uploadNextChunk returning early: ${reason}`, {
            level: "info",
          });
          console.log("uploadNextChunk returning early", { reason });
        }
        return;
      }

      try {
        isUploading.current = true;
        Sentry.captureMessage("Starting upload chunk", {
          level: "info",
          extra: { chunkSize: CHUNK_SIZE, uploadedSize: uploadedSize.current },
        });

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

        Sentry.captureMessage(
          `Upload chunk response status: ${response.status}`,
          {
            level: "info",
          },
        );
        console.log(`Upload chunk response status: ${response.status}`);

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
            Sentry.captureMessage("Chunk uploaded, continuing upload", {
              level: "info",
            });
          } else {
            setUploadProgress(100);
            uploadComplete.current = true;
            setIsUploadComplete(true);
            Sentry.captureMessage("Upload completed successfully", {
              level: "info",
            });
            return true;
          }

          setUploadProgress((uploadedSize.current / totalSize.current) * 100);
          return false; // Indicate that upload should continue
        } else {
          Sentry.captureMessage(
            `Unexpected response status during upload: ${response.status}`,
            {
              level: "error",
            },
          );
          throw new Error(`Unexpected response: ${response.status}`);
        }
      } catch (error) {
        Sentry.captureException(error, { level: "error" });
        console.error("Chunk upload failed:", error);
        setError("Failed to upload media chunk. Please try again.");
        throw error; // Re-throw the error instead of returning null
      } finally {
        isUploading.current = false;
        Sentry.captureMessage(
          "Upload chunk process completed (success or fail)",
          {
            level: "info",
          },
        );
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
            Sentry.captureMessage(
              "Recording stop process timed out after 18 seconds",
              {
                level: "warning",
              },
            );
            cancelUpload.current = true;
            setIsUploadComplete(true);
            reject(new Error("Recording stop process timed out"));
          }, 18000);

          const poorConnectionTimeoutId = setTimeout(() => {
            showWarningToast(
              "Your internet connection seems slow. Consider relocating for better upload speed.",
            );
            Sentry.captureMessage(
              "Poor internet connection detected during recording",
              {
                level: "warning",
              },
            );
          }, 8000);

          // Set up onstop handler before stopping
          mediaRecorder.current.onstop = async () => {
            // Wait for MediaRecorder to fully stop
            // Then stop tracks
            const tracks = mediaRecorder.current!.stream.getTracks();

            tracks.forEach((track) => {
              track.stop();
              track.enabled = false;
            });

            mediaRecorder.current!.stream.getTracks().forEach((track) => {
              mediaRecorder.current!.stream.removeTrack(track);
            });

            uploadStartTime.current = Date.now();
            setIsRecording(false);
            console.log("Setting isUploadingFinalChunks to true");
            Sentry.captureMessage("Setting isUploadingFinalChunks to true", {
              level: "info",
            });
            setIsUploadingFinalChunks(true);
            console.log(
              "Recording stopped, waiting for any in-progress uploads to complete...",
            );
            Sentry.captureMessage(
              "Recording stopped, waiting for any in-progress uploads to complete",
              {
                level: "info",
              },
            );

            // Wait for any in-progress uploads to complete
            while (isUploading.current && !cancelUpload.current) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            console.log("Uploading final chunks...");
            Sentry.captureMessage("Uploading final chunks", { level: "info" });

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
              Sentry.captureMessage("Final upload complete", { level: "info" });

              // Log timing to Sentry
              if (uploadStartTime.current) {
                const endTime = Date.now();
                const duration = endTime - uploadStartTime.current;
                Sentry.captureMessage("Upload completed", {
                  level: "info",
                  extra: {
                    duration: duration,
                    startTime: new Date(uploadStartTime.current).toISOString(),
                    endTime: new Date(endTime).toISOString(),
                  },
                });
                uploadStartTime.current = null; // Reset for next upload
              }
            } catch (error) {
              Sentry.captureException(error, { level: "error" });
              console.log("Error during final upload:", error);
              setError("Failed to upload all chunks. Please try again.");
            } finally {
              setIsUploadComplete(true);
              console.log("Setting isUploadingFinalChunks to false");
              Sentry.captureMessage("Setting isUploadingFinalChunks to false", {
                level: "info",
              });
              setIsUploadingFinalChunks(false);
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

  const startRecording = useCallback(
    async (isVideoEnabled: boolean, facingMode: "user" | "environment") => {
      if (!currentResponseAndUploadUrl.uploadSessionUrl) {
        throw new Error("No upload session URL available");
      }

      try {
        // Clean up first, before any new setup
        if (mediaRecorder.current) {
          const tracks = mediaRecorder.current.stream.getTracks();
          tracks.forEach((track) => {
            track.stop();
            track.enabled = false;
          });
          mediaRecorder.current = null;
        }

        // Reset all states before starting new recording
        uploadedSize.current = 0;
        totalSize.current = 0;
        buffer.current = new Blob([], {
          type: getSupportedMimeType(isVideoEnabled),
        });
        isUploading.current = false;
        uploadComplete.current = false;
        setIsUploadComplete(false);
        setIsRecording(false); // Ensure we're in a clean state

        // Now get new stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled ? { facingMode } : false,
          audio: true,
        });

        // Setup new recorder
        mediaRecorder.current = new MediaRecorder(stream, {
          mimeType: getSupportedMimeType(isVideoEnabled),
          videoBitsPerSecond: isVideoEnabled ? 2500000 : undefined,
          audioBitsPerSecond: 128000,
        });

        // Set up event handlers before starting
        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            addChunkToBuffer(event.data);
          }
        };

        mediaRecorder.current.onerror = (event) => {
          console.error("MediaRecorder error:", event);
          Sentry.captureException(event, { level: "error" });
          setError("An error occurred during recording. Please try again.");
          stopRecording();
        };

        // Finally start recording
        setIsRecording(true);
        mediaRecorder.current.start(500);

        // Set timeout after everything is running
        recordingTimeout.current = setTimeout(() => {
          void stopRecording();
          showWarningToast("Recording time limit reached (10 minutes).");
          Sentry.captureMessage(
            "Recording time limit reached, stopped recording",
            {
              level: "warning",
            },
          );
        }, MAX_RECORDING_TIME);
      } catch (err) {
        Sentry.captureException(err, { level: "error" });
        console.error("Error starting recording:", err);
        setError("Failed to start recording. Please check your permissions.");
      }
    },
    [currentResponseAndUploadUrl, addChunkToBuffer, stopRecording],
  );

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    uploadProgress,
    isUploadComplete,
    isUploadingFinalChunks,
  };
}
