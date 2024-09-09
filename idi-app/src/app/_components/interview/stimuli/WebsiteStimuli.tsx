import { Button } from "@/components/ui/button";
import { ArrowSquareOut } from "@phosphor-icons/react";
import React from "react";

interface WebsiteStimuliProps {
  websiteStimuli?: { websiteUrl: string; title?: string | null }[];
  isBackgroundLight: boolean;
}

export const WebsiteStimuli: React.FC<WebsiteStimuliProps> = ({
  websiteStimuli,
  isBackgroundLight,
}) => {
  if (!websiteStimuli || websiteStimuli.length === 0) return null;

  return (
    <div className="w-full max-w-md">
      {" "}
      {/* Add this wrapper */}
      <div className="mt-4 flex flex-col items-center justify-center gap-3">
        <div className="text-center text-sm text-neutral-500">
          Visit the links
        </div>
        {websiteStimuli.map((website, index) => (
          <Button
            key={index}
            variant="unstyled"
            className={`flex w-full gap-3 border border-black border-opacity-25 bg-org-secondary hover:opacity-70 ${
              isBackgroundLight ? "text-black" : "text-white"
            }`}
            onClick={() => window.open(website.websiteUrl, "_blank")}
          >
            <span className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap text-left">
              {website.title ?? website.websiteUrl}
            </span>
            <ArrowSquareOut size={16} weight="bold" className="flex-shrink-0" />
          </Button>
        ))}
      </div>
    </div>
  );
};
