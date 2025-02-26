import React, { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { StimulusModal } from "./StimulusModal";
import { useSignedReadUrls } from "@/hooks/useSignedReadUrls";

interface ImageStimuliProps {
  imageStimuli?: {
    bucketUrl: string;
    altText?: string | null;
    title?: string | null;
  }[];
}

export const ImageStimuli: React.FC<ImageStimuliProps> = ({ imageStimuli }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const filePaths = useMemo(
    () => imageStimuli?.map((image) => image.bucketUrl) ?? [],
    [imageStimuli],
  );
  const { data: signedUrlsData } = useSignedReadUrls({ filePaths });

  if (!signedUrlsData) return null;

  if (!imageStimuli || imageStimuli.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageStimuli.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < imageStimuli.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="flex h-full w-full items-start justify-center gap-4 md:px-8">
      {/* Large screen: show all images */}
      <div className="hidden h-full w-full items-center justify-center md:flex md:gap-4">
        {imageStimuli.map((image, index) => (
          <StimulusModal
            key={index}
            stimulus={{
              type: "image",
              url:
                signedUrlsData?.signedUrls[image.bucketUrl] ?? image.bucketUrl,
              altText: image.altText,
              title: image.title,
            }}
            trigger={
              <div className="h-full w-full cursor-pointer flex-col items-center justify-start">
                <div className="flex h-full w-full flex-col items-center justify-start">
                  <img
                    src={
                      signedUrlsData?.signedUrls[image.bucketUrl] ??
                      image.bucketUrl
                    }
                    alt={image.altText ?? `Image ${index + 1}`}
                    className="max-h-[84%] w-auto object-contain"
                  />
                  {image.title && (
                    <div className="mt-1 text-center text-sm text-theme-900">
                      {image.title}
                    </div>
                  )}
                </div>
              </div>
            }
          />
        ))}
      </div>

      {/* Small screen: show one image with navigation */}
      <div className="flex w-full items-center justify-center gap-3 md:hidden">
        {imageStimuli.length > 1 && (
          <ArrowLeft
            size={24}
            onClick={handlePrev}
            className="cursor-pointer text-theme-900"
            weight="bold"
          />
        )}
        <StimulusModal
          stimulus={{
            type: "image",
            url:
              signedUrlsData?.signedUrls[
                imageStimuli[currentIndex]?.bucketUrl ?? ""
              ] ??
              imageStimuli[currentIndex]?.bucketUrl ??
              "",
            altText: imageStimuli[currentIndex]?.altText,
            title: imageStimuli[currentIndex]?.title,
          }}
          trigger={
            <div className="flex h-full max-h-80 w-full flex-col items-center justify-start">
              <img
                src={
                  signedUrlsData?.signedUrls[
                    imageStimuli[currentIndex]?.bucketUrl ?? ""
                  ] ?? imageStimuli[currentIndex]?.bucketUrl
                }
                alt={
                  imageStimuli[currentIndex]?.altText ??
                  `Image ${currentIndex + 1}`
                }
                className="flex h-full max-h-[24rem] w-auto cursor-pointer object-contain"
              />
              {imageStimuli[currentIndex]?.title && (
                <div className="mt-1 text-center text-sm text-theme-900">
                  {imageStimuli[currentIndex]?.title}
                </div>
              )}
            </div>
          }
        />
        {imageStimuli.length > 1 && (
          <ArrowRight
            size={24}
            weight="bold"
            onClick={handleNext}
            className="cursor-pointer text-theme-900"
          />
        )}
      </div>
    </div>
  );
};
