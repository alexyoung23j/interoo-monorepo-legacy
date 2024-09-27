import React from "react";
import Image from "next/image";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicDropZone from "../../reusable/BasicDropZone";
import { LocalImageStimulus } from "./QuestionSetupSection";

type ImageStimuliSectionProps = {
  imageStimuli: LocalImageStimulus[];
  signedUrls: Record<string, string>;
  orgId: string;
  studyId: string;
  questionId: string;
  onImageUpload: (url: string) => void;
  onStimulusChange: (index: number, field: string, value: string) => void;
  onRemoveStimulus: (index: number) => void;
  setSelectedStimulus: React.Dispatch<
    React.SetStateAction<{
      type: "image" | "video";
      url: string;
      altText?: string | null;
      title?: string | null;
    } | null>
  >;
};

const MAX_STIMULI = 2;

const ImageStimuliSection: React.FC<ImageStimuliSectionProps> = ({
  imageStimuli,
  signedUrls,
  orgId,
  studyId,
  questionId,
  onImageUpload,
  onStimulusChange,
  onRemoveStimulus,
  setSelectedStimulus,
}) => {
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-4">
        {imageStimuli.map((stimulus, index) => (
          <div key={index} className="flex w-full items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative min-h-24 min-w-24 cursor-pointer rounded-md shadow-md">
                  <Image
                    src={signedUrls[stimulus.bucketUrl] ?? ""}
                    alt={stimulus.title ?? "Uploaded image"}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md shadow-sm"
                    onClick={() =>
                      setSelectedStimulus({
                        type: "image",
                        url: signedUrls[stimulus.bucketUrl] ?? "",
                        altText: stimulus.altText,
                        title: stimulus.title,
                      })
                    }
                  />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none md:w-fit md:min-w-[80vw] md:px-10 md:pt-14">
                <div className="flex flex-col items-center justify-center">
                  <img
                    src={signedUrls[stimulus.bucketUrl] ?? ""}
                    alt={stimulus.altText ?? "Image"}
                    className="max-h-[80vh] w-full max-w-full object-contain"
                  />
                  {stimulus.title && (
                    <div className="mt-2 p-4 text-center text-lg text-theme-off-white">
                      {stimulus.title}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <BasicInput
              type="text"
              placeholder="Image label (optional)"
              value={stimulus.title ?? ""}
              onSetValue={(value) => onStimulusChange(index, "title", value)}
            />
            <Button
              variant="unstyled"
              size="icon"
              onClick={() => onRemoveStimulus(index)}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
      {imageStimuli.length < MAX_STIMULI && (
        <BasicDropZone
          uploadMessage="Click or drag image files to upload"
          allowedFileTypes={["image/jpeg", "image/png"]}
          filePath={`uploaded_asssets/${orgId}/${studyId}/${questionId}/images`}
          onCompleted={onImageUpload}
        />
      )}
    </>
  );
};

export default ImageStimuliSection;
