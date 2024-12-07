import { CameraRotate } from "@phosphor-icons/react";
import React, { useRef, useEffect, useState, useCallback } from "react";
import * as Sentry from "@sentry/nextjs";
import { showErrorToast } from "@/app/utils/toastUtils";

const WebcamPreview: React.FC<{
  onCameraSwitch: (facingMode: "user" | "environment") => void;
  isRecording: boolean;
  onWebcamError: () => void;
}> = ({ onCameraSwitch, isRecording, onWebcamError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const startWebcam = async (facingMode: "user" | "environment") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: {
          location: "WebcamPreview.startWebcam",
          facingMode,
        },
      });
      console.error("Error accessing webcam:", err);
      showErrorToast(
        "We're having trouble accessing your camera. Please try using a different device or browser.",
      );
      onWebcamError();
    }
  };

  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput",
        );
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (err) {
        Sentry.captureException(err, {
          tags: {
            location: "WebcamPreview.checkCameras",
          },
        });
        console.error("Error checking cameras:", err);
        showErrorToast(
          "We're having trouble accessing your camera. Please try using a different device or browser.",
        );
        onWebcamError();
      }
    };

    checkCameras().catch((err) => {
      Sentry.captureException(err, {
        tags: {
          location: "WebcamPreview.checkCameras",
        },
      });
      console.error("Error checking cameras:", err);
      showErrorToast(
        "We're having trouble accessing your camera. Please try using a different device or browser.",
      );
      onWebcamError();
    });

    startWebcam(facingMode).catch((err) => {
      Sentry.captureException(err, {
        tags: {
          location: "WebcamPreview.startWebcam",
          facingMode,
        },
      });
      console.error("Error starting webcam:", err);
      showErrorToast(
        "We're having trouble accessing your camera. Please try using a different device or browser.",
      );
      onWebcamError();
    });

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode, onWebcamError]);

  const toggleCamera = useCallback(() => {
    if (!isRecording) {
      const newMode = facingMode === "user" ? "environment" : "user";
      setFacingMode(newMode);
      onCameraSwitch(newMode);
    }
  }, [facingMode, isRecording, onCameraSwitch]);

  return (
    <div className="relative h-[30vw] max-h-[120px] min-h-[80px] w-[18vw] max-w-[160px] overflow-hidden rounded-lg shadow-lg md:h-24 md:w-32">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover ${
          facingMode === "user" ? "scale-x-[-1]" : ""
        } transform`}
      />
      {hasMultipleCameras && !isRecording && (
        <div
          className="absolute bottom-1 right-1 rounded-full bg-black p-1"
          onClick={toggleCamera}
        >
          <CameraRotate className="text-theme-off-white" />
        </div>
      )}
    </div>
  );
};

export default WebcamPreview;
