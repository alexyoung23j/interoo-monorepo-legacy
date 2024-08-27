import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import React from "react";
import { Microphone } from "@phosphor-icons/react";
import { isColorLight } from "@/app/utils/color";
import { Organization } from "@shared/generated/client";

const InterviewBottomBar: React.FC<{ organization: Organization }> = ({
  organization,
}) => {
  const isBackgroundLight = isColorLight(organization.secondaryColor ?? "");

  return (
    <div className="bg-off-white mb-2 flex w-full items-center justify-between p-8">
      <div className="flex w-1/3 gap-2">
        <Switch className="data-[state=checked]:bg-org-secondary hidden md:block" />
        <div className="hidden text-sm text-neutral-400 md:block">Sound on</div>
      </div>

      <div className="relative flex w-1/3 flex-col items-center">
        <Button
          variant="unstyled"
          className="bg-org-secondary h-14 w-14 rounded-sm border border-black border-opacity-25 hover:opacity-80"
        >
          <Microphone
            className={`size-8 ${isBackgroundLight ? "text-black" : "text-white"}`}
          />
        </Button>
        <span className="absolute -bottom-7 text-sm">click to record</span>
      </div>

      <div className="flex w-1/3 justify-end">
        {/* Right side content */}
        <div></div>
      </div>
    </div>
  );
};

export default InterviewBottomBar;
