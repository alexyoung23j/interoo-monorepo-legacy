import React from "react";
import { Button } from "@/components/ui/button";
import type {
  Question,
  InterviewSession,
  Organization,
} from "@shared/generated/client";
import { getColorWithOpacity } from "@/app/utils/color";

interface RangeChoiceSelectProps {
  question: Question;
  interviewSession: InterviewSession;
  organization: Organization;
  isBackgroundLight: boolean;
  lowLabel: string;
  highLabel: string;
}

export const RangeChoiceSelect: React.FC<RangeChoiceSelectProps> = ({
  question,
  interviewSession,
  organization,
  isBackgroundLight,
  lowLabel,
  highLabel,
}) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );

  const handleSelection = (value: number) => {
    // TODO: Implement selection logic
    console.log("Selected value:", value);
  };

  if (question.lowRange === null || question.highRange === null) {
    return null;
  }

  const range = Array.from(
    { length: question.highRange - question.lowRange + 1 },
    (_, i) => i + question.lowRange!,
  );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="scrollbar-hide flex max-w-full overflow-x-auto">
        <div className="flex items-start gap-2 px-2 py-4">
          {range.map((value) => (
            <div key={value} className="flex flex-col items-center">
              <Button
                variant="unstyled"
                className={`flex h-12 w-12 items-center justify-center rounded-[1px] border border-black border-opacity-50 bg-[var(--button-bg)] text-black transition-colors hover:bg-[var(--button-hover-bg)]`}
                onClick={() => handleSelection(value)}
                style={
                  {
                    "--button-bg": newColor,
                    "--button-hover-bg": selectedColor,
                  } as React.CSSProperties
                }
              >
                {value}
              </Button>
              {value === question.lowRange && (
                <span className="mt-2 text-xs opacity-50">{lowLabel}</span>
              )}
              {value === question.highRange && (
                <span className="mt-2 text-xs opacity-50">{highLabel}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
