"use client";

import { useState, useRef } from "react";

export default function TestTranscribe() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream, {
      mimeType: "audio/webm",
    });
    audioChunks.current = [];

    mediaRecorder.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (audioChunks.current.length === 0) return;

    const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("questionId", "61dfc1ec-bd53-4694-89f5-35fcc526b086");
    formData.append(
      "interviewSessionId",
      "cfae2cb1-b190-4734-bf61-8a014c7a9760",
    );
    formData.append(
      "followUpQuestionId",
      "f226385d-bb93-49cc-90e3-76c347635edf",
    );

    try {
      const response = await fetch("http://localhost:8800/api/audio-response", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTranscription(data.latestResponse.fastTranscribedText);
      setFollowUpPrompt(data.followUpPrompt);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <h1>Test Audio Transcription</h1>
      <div>
        {!isRecording ? (
          <button onClick={startRecording}>Start Recording</button>
        ) : (
          <button onClick={stopRecording}>Stop Recording</button>
        )}
        <button onClick={handleSubmit} disabled={isRecording}>
          Transcribe
        </button>
      </div>
      {transcription && (
        <div>
          <h2>Transcription:</h2>
          <p>{transcription}</p>
        </div>
      )}
      {followUpPrompt && (
        <div>
          <h2>Follow-up Prompt:</h2>
          <p>{followUpPrompt}</p>
        </div>
      )}
    </div>
  );
}
