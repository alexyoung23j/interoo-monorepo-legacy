import React, { useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { VideoStimulusType } from "@shared/generated/client";
import { Button } from "@/components/ui/button";

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
    numVideos: number,
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
        className="flex h-full w-[60%] flex-col items-center justify-center"
      >
        {video.type === VideoStimulusType.UPLOADED ? (
          <video src={video.url} className="aspect-video flex-grow" controls />
        ) : (
          <iframe
            src={getYouTubeEmbedUrl(video.url)}
            className="aspect-video flex-grow"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
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
    <>
      {/* Large screen: show all videos */}
      <div className="hidden h-full min-h-[35vh] w-full items-center justify-center gap-4 md:flex">
        {videoStimuli.length > 1 && (
          <div onClick={handlePrev} className="cursor-pointer">
            <ArrowLeft size={24} />
          </div>
        )}
        {videoStimuli.map(
          (video, index) =>
            index === currentIndex &&
            renderVideo(video, index, videoStimuli.length),
        )}
        {videoStimuli.length > 1 && (
          <div onClick={handleNext} className="cursor-pointer">
            <ArrowRight size={24} />
          </div>
        )}
      </div>

      {/* Small screen: show one video with navigation */}
      <div className="flex w-full flex-col items-center justify-center gap-2 md:hidden">
        {videoStimuli.map(
          (video, index) =>
            index === currentIndex &&
            renderVideo(video, index, videoStimuli.length),
        )}
        {videoStimuli.length > 1 && (
          <div className="flex w-full items-center justify-center pt-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNext}
              className="flex gap-2"
            >
              Next Video
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
