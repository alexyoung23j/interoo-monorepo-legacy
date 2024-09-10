import React, { useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { VideoStimulusType } from "@shared/generated/client";

interface VideoStimuliProps {
  videoStimuli?: {
    url: string;
    title?: string | null;
    type: VideoStimulusType;
  }[];
}

export const VideoStimuli: React.FC<VideoStimuliProps> = ({ videoStimuli }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!videoStimuli || videoStimuli.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : videoStimuli.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < videoStimuli.length - 1 ? prev + 1 : 0));
  };

  const renderVideo = (
    video: NonNullable<VideoStimuliProps["videoStimuli"]>[number],
    index: number,
  ) => {
    const getYouTubeEmbedUrl = (url: string) => {
      const regex =
        /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/;
      const match = regex.exec(url);
      const videoId = match ? match[1] : null;
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    };

    return (
      <div
        key={index}
        className="flex h-full w-full flex-col items-center justify-center"
      >
        {video.type === VideoStimulusType.UPLOADED ? (
          <video
            src={video.url}
            className="flex h-full w-auto object-contain"
            controls
          />
        ) : (
          <div className="relative h-full w-auto md:min-h-[40vh]">
            <iframe
              src={getYouTubeEmbedUrl(video.url)}
              className="aspect-video h-full w-auto"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}
        {video.title && (
          <div className="text-theme-900 mt-1 text-center text-sm">
            {video.title}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 md:px-8">
      {/* Large screen: show all videos */}
      <div className="hidden h-full w-full items-center justify-center md:flex md:gap-4">
        {videoStimuli.map((video, index) => renderVideo(video, index))}
      </div>

      {/* Small screen: show one video with navigation */}
      <div className="flex w-full items-center justify-center gap-2 md:hidden">
        {videoStimuli.length > 1 && (
          <ArrowLeft
            size={24}
            onClick={handlePrev}
            className="cursor-pointer"
            weight="bold"
          />
        )}
        {videoStimuli.map(
          (video, index) => index === currentIndex && renderVideo(video, index),
        )}
        {videoStimuli.length > 1 && (
          <ArrowRight
            size={24}
            weight="bold"
            onClick={handleNext}
            className="cursor-pointer"
          />
        )}
      </div>
    </div>
  );
};
