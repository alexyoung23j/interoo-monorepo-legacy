import React from "react";
import BasicInput from "@/app/_components/reusable/BasicInput";
import { LocalWebsiteStimulus } from "./QuestionSetupSection";
import { Button } from "@/components/ui/button";
import { Plus, X } from "@phosphor-icons/react";

type WebsiteStimuliSectionProps = {
  websiteStimuli: LocalWebsiteStimulus[];
  onWebsiteAdd: () => void;
  onStimulusChange: (index: number, field: string, value: string) => void;
  onRemoveStimulus: (index: number) => void;
};

const WebsiteStimuliSection: React.FC<WebsiteStimuliSectionProps> = ({
  websiteStimuli,
  onWebsiteAdd,
  onStimulusChange,
  onRemoveStimulus,
}) => {
  const validateUrl = (url: string) => {
    const urlPattern =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return urlPattern.test(url);
  };

  return (
    <div className="flex w-full flex-col justify-start gap-2">
      {websiteStimuli.map((stimulus, index) => (
        <div key={index} className="flex w-full flex-row items-center gap-2">
          <div className="flex flex-1 flex-row gap-2">
            <BasicInput
              type="text"
              placeholder="Enter Url (https://...)"
              value={stimulus.websiteUrl ?? ""}
              onSetValue={(value) =>
                onStimulusChange(index, "websiteUrl", value)
              }
              className={`w-[25%] ${
                !validateUrl(stimulus.websiteUrl) && stimulus.websiteUrl
                  ? "border-red-500"
                  : ""
              }`}
            />
            <BasicInput
              type="text"
              placeholder="Enter Description (optional)"
              value={stimulus.title ?? ""}
              onSetValue={(value) => onStimulusChange(index, "title", value)}
              className="flex-1"
            />
          </div>
          <Button
            onClick={() => onRemoveStimulus(index)}
            variant="unstyled"
            size="icon"
            className="text-theme-600 hover:text-theme-900"
          >
            <X size={20} />
          </Button>
        </div>
      ))}
      <Button
        onClick={onWebsiteAdd}
        variant="unstyled"
        className="flex gap-2 text-theme-600 hover:text-theme-900"
      >
        <Plus size={20} />
        Add Website
      </Button>
    </div>
  );
};

export default WebsiteStimuliSection;
