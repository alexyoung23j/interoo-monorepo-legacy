import React, { useRef, useEffect } from "react";

const WebcamPreview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    startWebcam();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-34 h-28 scale-x-[-1] transform rounded-lg shadow-lg"
    />
  );
};

export default WebcamPreview;
