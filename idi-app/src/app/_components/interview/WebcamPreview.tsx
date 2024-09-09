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

    startWebcam().catch((err) => {
      console.error("Error accessing webcam:", err);
    });

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="h-[20vw] max-h-[120px] min-h-[80px] w-[26.67vw] min-w-[106px] max-w-[160px] overflow-hidden rounded-lg shadow-lg md:h-24 md:w-32">
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
