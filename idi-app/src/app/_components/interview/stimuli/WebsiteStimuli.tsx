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
    <div className="flex w-full flex-col">
      {/* Add this wrapper */}
      <div className="mt-4 flex flex-col items-center justify-center gap-3">
        <div className="text-center text-sm text-neutral-500">
          Visit the link{websiteStimuli.length > 1 ? "s" : ""}
        </div>
        {websiteStimuli.map((website, index) => (
          <Button
            key={index}
            variant="unstyled"
            className={`flex w-[80%] justify-between gap-3 border border-black border-opacity-25 bg-org-secondary hover:opacity-70 md:w-[50%] ${
              isBackgroundLight ? "text-theme-900" : "text-off-white"
            }`}
            onClick={() => window.open(website.websiteUrl, "_blank")}
          >
            <span className="hidden overflow-hidden text-ellipsis whitespace-nowrap text-left md:block">
              {website.title ?? website.websiteUrl}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-left md:hidden">
              {(website.title ?? website.websiteUrl).slice(0, 30) +
                ((website.title?.length ?? 0) > 30 ||
                website.websiteUrl.length > 30
                  ? "..."
                  : "")}
            </span>
            <ArrowSquareOut size={16} weight="bold" className="flex-shrink-0" />
          </Button>
        ))}
      </div>
    </div>
  );
};
