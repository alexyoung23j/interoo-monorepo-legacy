import { useState, useRef, useCallback, useEffect } from "react";
import { UploadUrlRequest } from "@shared/types";

export function useVideoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const uploadInterval = useRef<NodeJS.Timeout | null>(null);
  const signedUrls = useRef<{
    audio: { signedUrl: string; path: string; token: string };
    video: { signedUrl: string; path: string; token: string };
  } | null>(null);
  const audioRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const videoChunks = useRef<Blob[]>([]);

  const startRecording = useCallback(
    async (uploadUrlRequest: UploadUrlRequest) => {
      try {
        console.log("Sending request to get upload URLs");
        const response = await fetch(
          `http://localhost:8800/api/get-upload-urls`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(uploadUrlRequest),
            credentials: "include",
          },
        );
        console.log("Response status:", response.status);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get upload URLs: ${errorText}`);
        }
        signedUrls.current = await response.json();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        mediaRecorder.current = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp8,opus",
        });
        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log(
              `Received video chunk of size: ${event.data.size} bytes`,
            );
            videoChunks.current.push(event.data);
          }
        };

        const audioStream = new MediaStream(stream.getAudioTracks());
        audioRecorder.current = new MediaRecorder(audioStream, {
          mimeType: "audio/webm;codecs=opus",
        });
        audioRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log(
              `Received audio chunk of size: ${event.data.size} bytes`,
            );
            audioChunks.current.push(event.data);
          }
        };

        setIsRecording(true);
        mediaRecorder.current.start(5000); // Collect video data every 5 seconds
        audioRecorder.current.start(5000); // Collect audio data every 5 seconds

        uploadInterval.current = setInterval(async () => {
          await uploadChunks();
        }, 10000); // Upload chunks every 10 seconds
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
      if (audioRecorder.current) {
        audioRecorder.current.stop();
      }
      if (uploadInterval.current) {
        clearInterval(uploadInterval.current);
      }

      // Final upload of any remaining chunks
      await uploadChunks();
    }
  }, []);

  const uploadChunks = async () => {
    if (!signedUrls.current) {
      console.error("No signed URLs available");
      return;
    }
    setAwaitingResponse(true);

    try {
      if (videoChunks.current.length > 0) {
        await uploadChunk(
          new Blob(videoChunks.current, { type: "video/webm" }),
          "video",
        );
        videoChunks.current = [];
      }
      if (audioChunks.current.length > 0) {
        await uploadChunk(
          new Blob(audioChunks.current, { type: "audio/webm" }),
          "audio",
        );
        audioChunks.current = [];
      }
    } catch (error) {
      console.error("Error uploading chunks:", error);
      setError("Failed to upload chunks. Please try again.");
    } finally {
      setAwaitingResponse(false);
    }
  };

  const uploadChunk = async (blob: Blob, type: "audio" | "video") => {
    if (!signedUrls.current) {
      console.error("No signed URLs available");
      return;
    }

    const url = signedUrls.current[type].signedUrl;
    console.log(`Uploading ${type} to:`, url);

    try {
      const response = await fetch(url, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": type === "audio" ? "audio/webm" : "video/webm",
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${responseText}`,
        );
      }

      console.log(`${type} chunk uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${type} chunk:`, error);
      // Log the error and continue
    }
  };

  useEffect(() => {
    return () => {
      if (uploadInterval.current) {
        clearInterval(uploadInterval.current);
      }
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    awaitingResponse,
  };
}
