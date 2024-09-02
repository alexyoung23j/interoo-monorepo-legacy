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
    <div className="md:h-26 h-20 w-24 overflow-hidden rounded-lg shadow-lg sm:h-24 sm:w-28 md:w-32 lg:h-32 lg:w-40 xl:h-36 xl:w-48">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full scale-x-[-1] transform object-cover"
      />
    </div>
  );
};

export default WebcamPreview;
