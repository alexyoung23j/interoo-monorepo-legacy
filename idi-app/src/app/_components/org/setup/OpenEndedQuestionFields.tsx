import React, { useCallback } from "react";
import BasicSelect from "@/app/_components/reusable/BasicSelect";
import BasicTextArea from "@/app/_components/reusable/BasicTextArea";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import BasicInput from "@/app/_components/reusable/BasicInput";
import { FollowUpLevel } from "@shared/generated/client";
import type {
  LocalQuestion,
  LocalImageStimulus,
  LocalVideoStimulus,
  LocalWebsiteStimulus,
} from "./QuestionSetupSection";
import BasicDropZone from "../../reusable/BasicDropZone";
import Image from "next/image";

type OpenEndedQuestionFieldsProps = {
  question: LocalQuestion;
  onChange: (updatedQuestion: LocalQuestion) => void;
};

const MAX_STIMULI = 2;

const OpenEndedQuestionFields: React.FC<OpenEndedQuestionFieldsProps> = ({
  question,
  onChange,
}) => {
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
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          {question.imageStimuli.map((stimulus, index) => (
            <div key={index} className="mb-4 flex flex-col gap-2">
              <div className="relative h-40 w-full">
                <Image
                  src={stimulus.bucketUrl}
                  alt={stimulus.altText ?? "Uploaded image"}
                  layout="fill"
                  objectFit="contain"
                />
              </div>
              <BasicInput
                type="text"
                placeholder="Image title"
                value={stimulus.title ?? ""}
                onSetValue={(value) =>
                  handleStimulusChange("image", index, "title", value)
                }
              />
              <BasicInput
                type="text"
                placeholder="Alt text"
                value={stimulus.altText ?? ""}
                onSetValue={(value) =>
                  handleStimulusChange("image", index, "altText", value)
                }
              />
            </div>
          ))}
          {question.imageStimuli.length < MAX_STIMULI && (
            <BasicDropZone
              uploadMessage="Click or drag image files to upload"
              allowedFileTypes={["image/jpeg", "image/png"]}
              filePath={`studies/${question.id}/images`}
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
          {question.videoStimuli.map((stimulus, index) => (
            <div key={index} className="mb-4 flex flex-col gap-2">
              <video src={stimulus.url} controls className="max-h-40 w-full" />
              <BasicInput
                type="text"
                placeholder="Video title"
                value={stimulus.title ?? ""}
                onSetValue={(value) =>
                  handleStimulusChange("video", index, "title", value)
                }
              />
            </div>
          ))}
          {question.videoStimuli.length < MAX_STIMULI && (
            <BasicDropZone
              uploadMessage="Click or drag video files to upload"
              allowedFileTypes={["video/mp4", "video/webm"]}
              filePath={`studies/${question.id}/videos`}
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
