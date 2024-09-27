import React from "react";
import { Play, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicDropZone from "../../reusable/BasicDropZone";
import { LocalVideoStimulus } from "./QuestionSetupSection";
import { VideoStimulusType } from "@shared/generated/client";

type VideoStimuliSectionProps = {
  videoStimuli: LocalVideoStimulus[];
  signedUrls: Record<string, string>;
  orgId: string;
  studyId: string;
  questionId: string;
  onVideoUpload: (url: string) => void;
  onStimulusChange: (index: number, field: string, value: string) => void;
  onRemoveStimulus: (index: number) => void;
  setSelectedStimulus: React.Dispatch<
    React.SetStateAction<{
      type: "image" | "video";
      url: string;
      title?: string | null;
      videoType?: VideoStimulusType;
    } | null>
  >;
};

const MAX_STIMULI = 2;

const VideoStimuliSection: React.FC<VideoStimuliSectionProps> = ({
  videoStimuli,
  signedUrls,
  orgId,
  studyId,
  questionId,
  onVideoUpload,
  onStimulusChange,
  onRemoveStimulus,
  setSelectedStimulus,
}) => {
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-4">
        {videoStimuli.map((stimulus, index) => (
          <div key={index} className="flex w-full items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative min-h-24 min-w-24 cursor-pointer rounded-md border border-theme-400 shadow-md">
                  <video
                    src={signedUrls[stimulus.url] ?? ""}
                    className="max-h-24 w-full rounded-md object-cover shadow-sm"
                    onClick={() =>
                      setSelectedStimulus({
                        type: "video",
                        url: signedUrls[stimulus.url] ?? "",
                        title: stimulus.title,
                        videoType: stimulus.type,
                      })
                    }
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-theme-600">
                      <Play
                        size={20}
                        weight="fill"
                        className="text-theme-off-white"
                      />
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none md:w-fit md:min-w-[80vw] md:px-10 md:pt-14">
                <div className="flex flex-col items-center justify-center">
                  {stimulus.type === VideoStimulusType.UPLOADED ? (
                    <video
                      src={signedUrls[stimulus.url] ?? ""}
                      controls
                      className="max-h-[80vh] w-auto"
                    />
                  ) : (
                    <iframe
                      src={signedUrls[stimulus.url] ?? ""}
                      className="aspect-video w-full max-w-[80vw]"
                      allowFullScreen
                    />
                  )}
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
              placeholder="Video label (optional)"
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
      {videoStimuli.length < MAX_STIMULI && (
        <BasicDropZone
          uploadMessage="Click or drag video files to upload"
          allowedFileTypes={["video/mp4", "video/webm", "video/quicktime"]}
          filePath={`uploaded_asssets/${orgId}/${studyId}/${questionId}/videos`}
          onCompleted={onVideoUpload}
        />
      )}
    </>
  );
};

export default VideoStimuliSection;
