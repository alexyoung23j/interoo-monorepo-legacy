"use client";

import { useState } from "react";
import { useVideoRecorder } from "../api/useVideoRecorder";
import { UploadUrlRequest } from "@shared/types";

export default function TestVideoPage() {
  const {
    isRecording,
    startRecording,
    stopRecording,
    error,
    awaitingResponse,
  } = useVideoRecorder();

  const [uploadUrlRequest, setUploadUrlRequest] = useState<UploadUrlRequest>({
    organizationId: "test-org",
    studyId: "test-study",
    questionId: "test-question",
    responseId: "0b47b393-8228-40d6-a5fa-6fa0daaf9ffe",
    audio: { fileExtension: "webm", contentType: "audio/webm" },
    video: { fileExtension: "webm", contentType: "video/webm" },
  });

  const handleStartRecording = () => {
    startRecording(uploadUrlRequest);
  };

  return (
    <div>
      <h1>Test Video Recording</h1>
      <button onClick={handleStartRecording} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
      {error && <p>Error: {error}</p>}
      {awaitingResponse && <p>Processing...</p>}

      {/* Add input fields for uploadUrlRequest if needed */}
    </div>
  );
}
