import React, { useCallback, useMemo, useState } from "react";
import BasicSelect from "@/app/_components/reusable/BasicSelect";
import BasicTextArea from "@/app/_components/reusable/BasicTextArea";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import { FollowUpLevel, VideoStimulusType } from "@shared/generated/client";
import type {
  LocalQuestion,
  LocalImageStimulus,
  LocalVideoStimulus,
  LocalWebsiteStimulus,
} from "./QuestionSetupSection";
import { useSignedReadUrls } from "@/hooks/useSignedReadUrls";
import { useParams } from "next/navigation";
import ImageStimuliSection from "./ImageStimuliSection";
import VideoStimuliSection from "./VideoStimuliSection";
import WebsiteStimuliSection from "./WebsiteStimuliSection";

type OpenEndedQuestionFieldsProps = {
  question: LocalQuestion;
  onChange: (updatedQuestion: LocalQuestion) => void;
};

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

  const handleImageUpload = useCallback(
    (url: string) => {
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
          <ImageStimuliSection
            imageStimuli={question.imageStimuli}
            signedUrls={signedUrlsData?.signedUrls ?? {}}
            orgId={orgId}
            studyId={studyId}
            questionId={question.id ?? ""}
            onImageUpload={handleImageUpload}
            onStimulusChange={(index, field, value) =>
              handleStimulusChange("image", index, field, value)
            }
            onRemoveStimulus={(index) => handleRemoveStimulus("image", index)}
            setSelectedStimulus={setSelectedStimulus}
          />
        </BasicTitleSection>
      )}

      {question.hasStimulus && question.stimulusType === "Videos" && (
        <BasicTitleSection
          title="Video Stimuli"
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <VideoStimuliSection
            videoStimuli={question.videoStimuli}
            signedUrls={signedUrlsData?.signedUrls ?? {}}
            orgId={orgId}
            studyId={studyId}
            questionId={question.id ?? ""}
            onVideoUpload={handleVideoUpload}
            onRemoveStimulus={(index) => handleRemoveStimulus("video", index)}
            setSelectedStimulus={setSelectedStimulus}
            onStimulusChange={(index, field, value) =>
              handleStimulusChange("video", index, field, value)
            }
          />
        </BasicTitleSection>
      )}

      {question.hasStimulus && question.stimulusType === "Websites" && (
        <BasicTitleSection
          title="Website Stimuli"
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <WebsiteStimuliSection
            websiteStimuli={question.websiteStimuli}
            onWebsiteAdd={handleWebsiteAdd}
            onStimulusChange={(index, field, value) =>
              handleStimulusChange("website", index, field, value)
            }
          />
        </BasicTitleSection>
      )}
    </>
  );
};

export default React.memo(OpenEndedQuestionFields);
