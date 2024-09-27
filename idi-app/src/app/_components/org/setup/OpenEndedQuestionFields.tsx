import React, { useCallback, useMemo, useState } from "react";
import BasicSelect from "@/app/_components/reusable/BasicSelect";
import BasicTextArea from "@/app/_components/reusable/BasicTextArea";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import BasicInput from "@/app/_components/reusable/BasicInput";
import { FollowUpLevel, VideoStimulusType } from "@shared/generated/client";
import type {
  LocalQuestion,
  LocalImageStimulus,
  LocalVideoStimulus,
  LocalWebsiteStimulus,
} from "./QuestionSetupSection";
import BasicDropZone from "../../reusable/BasicDropZone";
import Image from "next/image";
import { useSignedReadUrls } from "@/hooks/useSignedReadUrls";
import { useParams } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type OpenEndedQuestionFieldsProps = {
  question: LocalQuestion;
  onChange: (updatedQuestion: LocalQuestion) => void;
};

const MAX_STIMULI = 2;

const OpenEndedQuestionFields: React.FC<OpenEndedQuestionFieldsProps> = ({
  question,
  onChange,
}) => {
  const { studyId, orgId } = useParams<{ studyId: string; orgId: string }>();
  const [selectedStimulus, setSelectedStimulus] = useState<{
    type: "image" | "video";
    url: string;
    altText?: string | null;
    title?: string | null;
    videoType?: VideoStimulusType;
  } | null>(null);

  const renderModalContent = () => {
    if (!selectedStimulus) return null;

    if (selectedStimulus.type === "image") {
      return (
        <img
          src={selectedStimulus.url}
          alt={selectedStimulus.altText ?? "Image"}
          className="max-h-[80vh] w-full max-w-full object-contain"
        />
      );
    } else if (selectedStimulus.type === "video") {
      if (selectedStimulus.videoType === VideoStimulusType.UPLOADED) {
        return (
          <video
            src={selectedStimulus.url}
            controls
            className="max-h-[80vh] w-auto"
          />
        );
      } else {
        return (
          <iframe
            src={selectedStimulus.url}
            className="aspect-video w-full max-w-[80vw]"
            allowFullScreen
          />
        );
      }
    }
  };

  const handleImageUpload = useCallback(
    (url: string) => {
      if (question.imageStimuli.length >= MAX_STIMULI) return;
      const newImageStimulus: LocalImageStimulus = {
        bucketUrl: url,
        title: "",
        altText: "",
      };
      onChange({
        ...question,
        hasStimulus: true,
        imageStimuli: [...question.imageStimuli, newImageStimulus],
      });
    },
    [onChange, question],
  );

  const handleVideoUpload = useCallback(
    (url: string) => {
      if (question.videoStimuli.length >= MAX_STIMULI) return;
      const newVideoStimulus: LocalVideoStimulus = {
        url,
        type: "UPLOADED",
        title: "",
      };
      onChange({
        ...question,
        videoStimuli: [...question.videoStimuli, newVideoStimulus],
      });
    },
    [onChange, question],
  );
  const handleWebsiteAdd = useCallback(() => {
    const newWebsiteStimulus: LocalWebsiteStimulus = {
      websiteUrl: "",
      title: "",
    };
    onChange({
      ...question,
      websiteStimuli: [...question.websiteStimuli, newWebsiteStimulus],
    });
  }, [onChange, question]);

  const handleStimulusChange = useCallback(
    (
      type: "image" | "video" | "website",
      index: number,
      field: string,
      value: string,
    ) => {
      onChange({
        ...question,
        [`${type}Stimuli`]: question[`${type}Stimuli`].map((stimulus, i) =>
          i === index ? { ...stimulus, [field]: value } : stimulus,
        ),
      });
    },
    [onChange, question],
  );

  const handleInputChange = useCallback(
    (field: keyof LocalQuestion) => (value: string) => {
      onChange({ ...question, [field]: value });
    },
    [onChange, question],
  );

  const handleSelectChange = useCallback(
    (field: keyof LocalQuestion) => (value: string) => {
      let typedValue: FollowUpLevel | undefined;
      if (field === "followUpLevel") {
        typedValue = value as FollowUpLevel;
      } else {
        return;
      }

      onChange({ ...question, [field]: typedValue });
    },
    [onChange, question],
  );

  const handleStimulusTypeChange = useCallback(
    (value: string) => {
      onChange({
        ...question,
        hasStimulus: value !== "None",
        stimulusType: value as "None" | "Images" | "Videos" | "Websites",
      });
    },
    [onChange, question],
  );

  const handleRemoveStimulus = useCallback(
    (type: "image" | "video", index: number) => {
      onChange({
        ...question,
        [`${type}Stimuli`]: question[`${type}Stimuli`].filter(
          (_, i) => i !== index,
        ),
      });
    },
    [onChange, question],
  );

  const stimuliPaths = useMemo(() => {
    return [
      ...question.imageStimuli.map((s) => s.bucketUrl),
      ...question.videoStimuli.map((s) => s.url),
    ];
  }, [question.imageStimuli, question.videoStimuli]);

  const { data: signedUrlsData } = useSignedReadUrls({
    filePaths: stimuliPaths,
  });

  return (
    <>
      <BasicTitleSection
        title="Should Follow Up"
        subtitle="If you'd like the AI to ask follow ups, select yes."
        titleClassName="!font-medium"
        subtitleClassName="!font-normal"
      >
        <BasicSelect
          options={[
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]}
          placeholder="Select follow up option"
          value={question.shouldFollowUp ? "true" : "false"}
          onValueChange={(value) =>
            onChange({ ...question, shouldFollowUp: value === "true" })
          }
        />
      </BasicTitleSection>

      {question.shouldFollowUp && (
        <>
          <BasicTitleSection
            title="Follow Up Settings"
            titleClassName="!font-medium"
            subtitleClassName="!font-normal"
          >
            <BasicSelect
              options={Object.values(FollowUpLevel)
                .filter((level) => level !== FollowUpLevel.AUTOMATIC)
                .map((level) => ({
                  value: level,
                  label: (() => {
                    switch (level) {
                      case FollowUpLevel.SURFACE:
                        return "Surface Level (1-2 questions)";
                      case FollowUpLevel.LIGHT:
                        return "Deeper Dive (2-3 questions)";
                      case FollowUpLevel.DEEP:
                        return "Comprehensive (3-5 questions)";
                      default:
                        return level;
                    }
                  })(),
                }))}
              placeholder="Select follow up setting"
              value={question.followUpLevel ?? ""}
              onValueChange={handleSelectChange("followUpLevel")}
            />
          </BasicTitleSection>

          <BasicTitleSection
            title="Context and Instructions"
            subtitle="Include context to provide the AI with information about how to follow up, key areas of interest, goals of the question, etc. The quality of follow ups will be greatly enhanced by writing detailed question context."
            titleClassName="!font-medium"
            subtitleClassName="!font-normal"
          >
            <BasicTextArea
              placeholder="Enter goals"
              rows={6}
              className="w-full"
              value={question.context ?? ""}
              onSetValue={handleInputChange("context")}
            />
          </BasicTitleSection>
        </>
      )}

      <BasicTitleSection
        title="Include Stimuli"
        subtitle="Select the type of stimuli to include with this question."
        titleClassName="!font-medium"
        subtitleClassName="!font-normal"
      >
        <BasicSelect
          options={[
            { value: "None", label: "None" },
            { value: "Images", label: "Images" },
            { value: "Videos", label: "Videos" },
            { value: "Websites", label: "Websites" },
          ]}
          placeholder="Select stimuli type"
          value={
            question.hasStimulus
              ? question.imageStimuli.length > 0
                ? "Images"
                : question.videoStimuli.length > 0
                  ? "Videos"
                  : question.websiteStimuli.length > 0
                    ? "Websites"
                    : "None"
              : "None"
          }
          onValueChange={handleStimulusTypeChange}
        />
      </BasicTitleSection>

      {question.hasStimulus && question.stimulusType === "Images" && (
        <BasicTitleSection
          title="Image Stimuli"
          subtitle="Add images to present the user with context for your question. Limit to 2 images."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <div className="mb-4 flex flex-wrap gap-4">
            {question.imageStimuli.map((stimulus, index) => (
              <div key={index} className="flex w-full items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative min-h-24 min-w-24 cursor-pointer rounded-md shadow-md">
                      <Image
                        src={
                          signedUrlsData?.signedUrls[stimulus.bucketUrl] ?? ""
                        }
                        alt={stimulus.title ?? "Uploaded image"}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-md shadow-sm"
                        onClick={() =>
                          setSelectedStimulus({
                            type: "image",
                            url:
                              signedUrlsData?.signedUrls[stimulus.bucketUrl] ??
                              "",
                            altText: stimulus.altText,
                            title: stimulus.title,
                          })
                        }
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none md:w-fit md:min-w-[80vw] md:px-10 md:pt-14">
                    <div className="flex flex-col items-center justify-center">
                      {renderModalContent()}
                      {selectedStimulus?.title && (
                        <div className="mt-2 p-4 text-center text-lg text-theme-off-white">
                          {selectedStimulus.title}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <BasicInput
                  type="text"
                  placeholder="Image label (optional)"
                  value={stimulus.title ?? ""}
                  onSetValue={(value) =>
                    handleStimulusChange("image", index, "title", value)
                  }
                />
                <Button
                  variant="unstyled"
                  size="icon"
                  onClick={() => handleRemoveStimulus("image", index)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
          {question.imageStimuli.length < MAX_STIMULI && (
            <BasicDropZone
              uploadMessage="Click or drag image files to upload"
              allowedFileTypes={["image/jpeg", "image/png"]}
              filePath={`uploaded_asssets/${orgId}/${studyId}/${question.id}/images`}
              onCompleted={handleImageUpload}
            />
          )}
        </BasicTitleSection>
      )}

      {question.hasStimulus && question.stimulusType === "Videos" && (
        <BasicTitleSection
          title="Video Stimuli"
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <div className="flex flex-wrap gap-4">
            {question.videoStimuli.map((stimulus, index) => (
              <div key={index} className="relative w-64">
                <Dialog>
                  <DialogTrigger asChild>
                    <video
                      src={signedUrlsData?.signedUrls[stimulus.url] ?? ""}
                      className="w-full cursor-pointer rounded"
                      onClick={() =>
                        setSelectedStimulus({
                          type: "video",
                          url: signedUrlsData?.signedUrls[stimulus.url] ?? "",
                          title: stimulus.title,
                          videoType: stimulus.type,
                        })
                      }
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none md:w-fit md:min-w-[80vw] md:px-10 md:pt-14">
                    <div className="flex flex-col items-center justify-center">
                      {renderModalContent()}
                      {selectedStimulus?.title && (
                        <div className="mt-2 p-4 text-center text-lg text-theme-off-white">
                          {selectedStimulus.title}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <button
                  onClick={() => handleRemoveStimulus("video", index)}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-theme-900 text-theme-off-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {question.videoStimuli.length < MAX_STIMULI && (
            <BasicDropZone
              uploadMessage="Click or drag video files to upload"
              allowedFileTypes={["video/mp4", "video/webm", "video/quicktime"]}
              filePath={`uploaded_asssets/${orgId}/${studyId}/${question.id}/videos`}
              onCompleted={handleVideoUpload}
            />
          )}
        </BasicTitleSection>
      )}

      {question.hasStimulus && question.stimulusType === "Websites" && (
        <BasicTitleSection
          title="Website Stimuli"
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <button
            onClick={handleWebsiteAdd}
            className="mb-2 rounded bg-theme-600 px-4 py-2 text-theme-off-white"
          >
            Add Website
          </button>
          {question.websiteStimuli.map((stimulus, index) => (
            <div key={index} className="mt-2 flex flex-col gap-2">
              <BasicInput
                type="text"
                placeholder="Website URL"
                value={stimulus.websiteUrl}
                onSetValue={(value) =>
                  handleStimulusChange("website", index, "websiteUrl", value)
                }
              />
              <BasicInput
                type="text"
                placeholder="Website title"
                value={stimulus.title ?? ""}
                onSetValue={(value) =>
                  handleStimulusChange("website", index, "title", value)
                }
              />
            </div>
          ))}
        </BasicTitleSection>
      )}
    </>
  );
};

export default React.memo(OpenEndedQuestionFields);
