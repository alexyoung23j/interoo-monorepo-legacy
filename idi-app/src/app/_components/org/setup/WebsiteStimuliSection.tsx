import React from "react";
import BasicInput from "@/app/_components/reusable/BasicInput";
import { LocalWebsiteStimulus } from "./QuestionSetupSection";

type WebsiteStimuliSectionProps = {
  websiteStimuli: LocalWebsiteStimulus[];
  onWebsiteAdd: () => void;
  onStimulusChange: (index: number, field: string, value: string) => void;
};

const WebsiteStimuliSection: React.FC<WebsiteStimuliSectionProps> = ({
  websiteStimuli,
  onWebsiteAdd,
  onStimulusChange,
}) => {
  return (
    <>
      <button
        onClick={onWebsiteAdd}
        className="mb-2 rounded bg-theme-600 px-4 py-2 text-theme-off-white"
      >
        Add Website
      </button>
      {websiteStimuli.map((stimulus, index) => (
        <div key={index} className="mt-2 flex flex-col gap-2">
          <BasicInput
            type="text"
            placeholder="Website URL"
            value={stimulus.websiteUrl}
            onSetValue={(value) => onStimulusChange(index, "websiteUrl", value)}
          />
          <BasicInput
            type="text"
            placeholder="Website title"
            value={stimulus.title ?? ""}
            onSetValue={(value) => onStimulusChange(index, "title", value)}
          />
        </div>
      ))}
    </>
  );
};

export default WebsiteStimuliSection;
