import React from "react";
import { Button } from "@/components/ui/button";
import type {
  Question,
  InterviewSession,
  Organization,
} from "@shared/generated/client";
import { getColorWithOpacity } from "@/app/utils/color";
import { cx } from "@/tailwind/styling";

interface RangeChoiceSelectProps {
  question: Question;
  organization: Organization;
  isBackgroundLight: boolean;
  lowLabel: string;
  highLabel: string;
  rangeSelectionValue: number | null;
  setRangeSelectionValue: (value: number | null) => void;
}

export const RangeChoiceSelect: React.FC<RangeChoiceSelectProps> = ({
  question,
  organization,
  isBackgroundLight,
  lowLabel,
  highLabel,
  rangeSelectionValue,
  setRangeSelectionValue,
}) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const hoverColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.25,
  );
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.6,
  );

  const handleSelection = (value: number) => {
    setRangeSelectionValue(value);
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
      <div className="md:scrollbar flex max-w-full overflow-x-auto scrollbar-hide">
        <div className="flex items-start gap-2 px-2 py-4">
          {range.map((value) => (
            <div key={value} className="flex flex-col items-center">
              <Button
                variant="unstyled"
                className={cx(
                  "flex h-12 w-12 items-center justify-center rounded-[1px] border border-black border-opacity-50 text-black transition-colors",
                  {
                    "bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)]":
                      rangeSelectionValue !== value,
                    "bg-[var(--button-selected-bg)]":
                      rangeSelectionValue === value,
                  },
                )}
                onClick={() => handleSelection(value)}
                style={
                  {
                    "--button-bg": newColor,
                    "--button-selected-bg": selectedColor,
                    "--button-hover-bg": hoverColor,
                  } as React.CSSProperties
                }
              >
                {value}
              </Button>
              {/* ... existing code for labels ... */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
