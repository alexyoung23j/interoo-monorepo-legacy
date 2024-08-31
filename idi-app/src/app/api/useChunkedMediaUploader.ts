import { useState, useRef, useCallback } from "react";
import { UploadUrlRequest } from "@shared/types";

export function useChunkedMediaUploader() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const uploadUrl = useRef<string | null>(null);
  const filePath = useRef<string | null>(null);

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
    const data = await response.json();
    uploadUrl.current = data.signedUrl;
    filePath.current = data.path;
  };

  const startRecording = useCallback(
    async (uploadUrlRequest: UploadUrlRequest, isVideoEnabled: boolean) => {
      try {
        await getSignedUrl(uploadUrlRequest);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled,
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
        mediaRecorder.current.start(1000); // Collect data every second
      } catch (err) {
        console.error("Error starting recording:", err);
        setError("Failed to start recording. Please check your permissions.");
      }
    },
    [],
  );

  const stopRecording = useCallback(async () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      return new Promise<void>((resolve) => {
        if (mediaRecorder.current) {
          mediaRecorder.current.onstop = async () => {
            setIsRecording(false);
            const finalBlob = new Blob(chunks.current, { type: "video/webm" });
            await uploadFile(finalBlob);
            chunks.current = [];
            resolve();
          };
          mediaRecorder.current.stop();
        } else {
          resolve();
        }
      });
    }
  }, []);

  const uploadFile = async (file: Blob) => {
    if (!uploadUrl.current) {
      throw new Error("Upload URL not set");
    }

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl.current, true);
    xhr.setRequestHeader("Content-Type", "video/webm");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentage = ((e.loaded / e.total) * 100).toFixed(2);
        setUploadProgress(parseFloat(percentage));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        console.log("Upload completed");
        setUploadProgress(100);
      } else {
        console.error("Upload failed:", xhr.statusText);
        setError("Failed to upload video. Please try again.");
      }
    };

    xhr.onerror = () => {
      console.error("Upload failed");
      setError("Failed to upload video. Please try again.");
    };

    xhr.send(file);
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    awaitingResponse,
    uploadProgress,
  };
}
