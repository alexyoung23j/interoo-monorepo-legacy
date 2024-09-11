import React from "react";
import { Button } from "@/components/ui/button";
import { Organization, Study } from "@shared/generated/client";
import { getColorWithOpacity } from "@/app/utils/color";

const InterviewFinishedContent: React.FC<{
  study: Study;
  organization: Organization;
  onFinish: () => void;
}> = ({ study, organization, onFinish }) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="mb-20 flex w-full max-w-[70%] flex-col gap-4 md:max-w-[28rem]">
        <div className="text-lg">Thank you for completing the interview!</div>
        <div className="text-sm text-neutral-500 md:text-base">
          Your responses have been recorded. We appreciate your participation in
          this study.
        </div>
        {/* <Button
        variant="unstyled"
        className={`mt-8 flex min-h-10 w-fit max-w-md gap-3 rounded-[1px] border border-black border-opacity-50 bg-[var(--button-bg)] text-black transition-colors hover:bg-[var(--button-hover-bg)]`}
        onClick={onFinish}
        style={
          {
            "--button-bg": newColor,
            "--button-hover-bg": selectedColor,
          } as React.CSSProperties
        }
      >
        Finish
      </Button> */}
      </div>
    </div>
  );
};

export default InterviewFinishedContent;
