import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "@phosphor-icons/react";
import WaveSurfer from "wavesurfer.js";

interface BasicMediaViewerProps {
  mediaUrl: string;
  mediaType: "video/webm" | "audio/webm";
}

const PlayPauseButton: React.FC<{
  isPlaying: boolean;
  onClick: () => void;
  isVideo: boolean;
}> = ({ isPlaying, onClick, isVideo }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center rounded-full bg-theme-500 text-theme-off-white outline-none transition-colors hover:border-[4px] hover:border-theme-200 hover:bg-theme-700 ${
      isVideo
        ? "absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2"
        : "min-h-16 min-w-16"
    }`}
  >
    {isPlaying ? (
      <Pause size={32} weight="fill" />
    ) : (
      <Play size={32} weight="fill" />
    )}
  </button>
);

const VideoViewer: React.FC<{ mediaUrl: string }> = ({ mediaUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const handleEnded = () => setIsPlaying(false);
    videoRef.current?.addEventListener("ended", handleEnded);
    return () => videoRef.current?.removeEventListener("ended", handleEnded);
  }, []);

  return (
    <div
      className="relative flex w-full cursor-pointer items-center justify-center"
      style={{ aspectRatio: "4/3" }}
      onClick={togglePlayPause}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video
        ref={videoRef}
        src={mediaUrl}
        className="h-full w-full object-contain"
      />
      {(isHovering || !isPlaying) && (
        <PlayPauseButton
          isPlaying={isPlaying}
          onClick={() => {
            togglePlayPause();
          }}
          isVideo={true}
        />
      )}
    </div>
  );
};

const AudioViewer: React.FC<{ mediaUrl: string }> = ({ mediaUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#D5DDE1",
        progressColor: "#426473",
        cursorColor: "#426473",
        barWidth: 3,
        barRadius: 1,
        height: 60,
        url: mediaUrl,
      });

      wavesurfer.current.on("finish", () => setIsPlaying(false));

      return () => {
        wavesurfer.current?.destroy();
      };
    }
  }, [mediaUrl]);

  const togglePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setIsPlaying(wavesurfer.current.isPlaying());
    }
  };

  return (
    <div className="flex w-full items-center justify-center gap-6 p-4 px-32">
      <PlayPauseButton
        isPlaying={isPlaying}
        onClick={togglePlayPause}
        isVideo={false}
      />
      <div ref={waveformRef} className="w-full" />
    </div>
  );
};

const BasicMediaViewer: React.FC<BasicMediaViewerProps> = ({
  mediaUrl,
  mediaType,
}) => {
  const isVideo = mediaType === "video/webm";

  return (
    <div
      style={{ aspectRatio: "4/3" }}
      className={`flex h-full min-h-72 w-full items-center justify-center rounded-sm border-2 border-theme-200 ${isVideo ? "bg-theme-900" : "bg-theme-50"}`}
    >
      {isVideo ? (
        <VideoViewer mediaUrl={mediaUrl} />
      ) : (
        <AudioViewer mediaUrl={mediaUrl} />
      )}
    </div>
  );
};

export default BasicMediaViewer;
