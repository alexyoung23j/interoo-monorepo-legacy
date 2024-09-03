import { useState, useRef, useCallback } from "react";
import { useAtom } from "jotai";
import { uploadSessionUrlAtom } from "@/app/state/atoms";
import type { UploadUrlRequest } from "@shared/types";

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MiB

export function useChunkedMediaUploader() {
  const [uploadSessionUrl] = useAtom(uploadSessionUrlAtom);
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
      !uploadSessionUrl ||
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
      const response = await fetch(uploadSessionUrl, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes ${start}-${end}/${total}`,
        },
        body: chunk,
      });

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
      `Added chunk to buffer. Total size: ${totalSize.current} bytes`,
    );

    if (
      buffer.current.size >= CHUNK_SIZE &&
      !isUploading.current &&
      !uploadComplete.current
    ) {
      uploadNextChunk().catch(console.error);
    }
  }, []);

  const startRecording = useCallback(
    async (isVideoEnabled: boolean) => {
      if (!uploadSessionUrl) {
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
        mediaRecorder.current.start(1000); // Collect data every second
      } catch (err) {
        console.error("Error starting recording:", err);
        setError("Failed to start recording. Please check your permissions.");
      }
    },
    [uploadSessionUrl, addChunkToBuffer],
  );

  const stopRecording = useCallback(async () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      return new Promise<void>((resolve) => {
        if (mediaRecorder.current) {
          mediaRecorder.current.onstop = async () => {
            setIsRecording(false);
            console.log("Recording stopped, uploading final chunks...");

            while (buffer.current.size > 0 && !uploadComplete.current) {
              await uploadNextChunk(true);
              if (uploadComplete.current) break;
              await new Promise((r) => setTimeout(r, 100)); // Small delay to prevent tight loop
            }

            console.log("All chunks uploaded.");
            resolve();
          };
          mediaRecorder.current.stop();
        } else {
          resolve();
        }
      });
    }
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    uploadProgress,
  };
}
