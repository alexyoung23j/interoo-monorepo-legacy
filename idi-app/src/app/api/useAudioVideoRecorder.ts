import { useState, useRef, useCallback } from "react";
import { UploadUrlRequest } from "@shared/types";

export function useAudioVideoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const uploadInterval = useRef<NodeJS.Timeout | null>(null);
  const signedUrl = useRef<{
    signedUrl: string;
    path: string;
    token: string;
  } | null>(null);
  const chunks = useRef<Blob[]>([]);

  const getSignedUrl = async (uploadUrlRequest: UploadUrlRequest) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-signed-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadUrlRequest),
        credentials: "include",
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${await response.text()}`);
    }
    signedUrl.current = await response.json();
  };

  const uploadChunk = async (blob: Blob) => {
    if (!signedUrl.current) return;
    const url = signedUrl.current.signedUrl;
    await fetch(url, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": "video/webm" },
    });
  };

  const startRecording = useCallback(
    async (uploadUrlRequest: UploadUrlRequest) => {
      try {
        await getSignedUrl(uploadUrlRequest);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        mediaRecorder.current = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp8,opus",
        });

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.current.push(event.data);
          }
        };

        setIsRecording(true);
        mediaRecorder.current.start(5000);

        uploadInterval.current = setInterval(async () => {
          if (chunks.current.length > 0) {
            const videoBlob = new Blob(chunks.current, { type: "video/webm" });
            await uploadChunk(videoBlob);
            chunks.current = [];
          }
        }, 10000);
      } catch (err) {
        console.error("Error starting recording:", err);
        setError("Failed to start recording. Please check your permissions.");
      }
    },
    [],
  );

  const stopRecording = useCallback(async () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      setIsRecording(false);
      mediaRecorder.current.stop();
      if (uploadInterval.current) {
        clearInterval(uploadInterval.current);
      }
      // Upload any remaining chunks
      if (chunks.current.length > 0) {
        const videoBlob = new Blob(chunks.current, { type: "video/webm" });
        await uploadChunk(videoBlob);
        chunks.current = [];
      }
    }
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    awaitingResponse,
  };
}
