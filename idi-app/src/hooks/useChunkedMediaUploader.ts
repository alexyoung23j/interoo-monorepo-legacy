import { useState, useRef, useCallback } from "react";
import { useAtom } from "jotai";
import { currentResponseAndUploadUrlAtom } from "@/app/state/atoms";
import type { UploadUrlRequest } from "@shared/types";

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MiB

export function useChunkedMediaUploader() {
  const [currentResponseAndUploadUrl] = useAtom(
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

  const uploadNextChunk = async (isLastChunk = false) => {
    if (
      !currentResponseAndUploadUrl.uploadSessionUrl ||
      buffer.current.size === 0 ||
      isUploading.current ||
      uploadComplete.current
    )
      return;

    isUploading.current = true;
    const chunkSize = Math.min(CHUNK_SIZE, buffer.current.size);
    const chunk = buffer.current.slice(0, chunkSize);

    const start = uploadedSize.current;
    const end = start + chunk.size - 1;
    const total = isLastChunk ? totalSize.current.toString() : "*";

    try {
      console.log(`Uploading chunk: bytes ${start}-${end}/${total}`);
      const response = await fetch(
        currentResponseAndUploadUrl.uploadSessionUrl,
        {
          method: "PUT",
          headers: {
            "Content-Range": `bytes ${start}-${end}/${total}`,
          },
          body: chunk,
        },
      );

      if (response.status === 308) {
        const range = response.headers.get("Range");
        if (range) {
          const [, serverEnd] = range.split("-").map(Number);
          if (serverEnd !== undefined) {
            uploadedSize.current = serverEnd + 1;
          }
        }
        console.log(
          `Partial upload successful, uploaded to byte ${uploadedSize.current}`,
        );
        buffer.current = buffer.current.slice(chunkSize);
      } else if (response.status === 200 || response.status === 201) {
        console.log("Upload completed");
        setUploadProgress(100);
        uploadComplete.current = true;
        return true;
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }

      setUploadProgress((uploadedSize.current / totalSize.current) * 100);
    } catch (error) {
      console.error("Chunk upload failed:", error);
      setError("Failed to upload media chunk. Please try again.");
    } finally {
      isUploading.current = false;
    }

    return false;
  };

  const addChunkToBuffer = useCallback((chunk: Blob) => {
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
  }, []);

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
      } catch (err) {
        console.error("Error starting recording:", err);
        setError("Failed to start recording. Please check your permissions.");
      }
    },
    [currentResponseAndUploadUrl.uploadSessionUrl, addChunkToBuffer],
  );

  const stopRecording = useCallback(async () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      return new Promise<void>((resolve) => {
        if (mediaRecorder.current) {
          mediaRecorder.current.onstop = async () => {
            setIsRecording(false);
            console.log("Recording stopped, uploading final chunks...");

            let retryCount = 0;
            const maxRetries = 5;

            while (
              buffer.current.size > 0 &&
              !uploadComplete.current &&
              retryCount < maxRetries
            ) {
              try {
                const uploadSuccessful = await uploadNextChunk(true);
                if (uploadSuccessful) {
                  break;
                }
              } catch (error) {
                console.error("Error uploading chunk:", error);
              }

              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`Retry attempt ${retryCount} of ${maxRetries}`);
                await new Promise((r) => setTimeout(r, 1000)); // Wait 1 second before retrying
              }
            }

            if (retryCount === maxRetries) {
              console.error("Max retries reached. Upload may be incomplete.");
              setError("Failed to upload all chunks. Please try again.");
            } else {
              console.log("All chunks uploaded successfully.");
            }

            resolve();
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
