import React, { useState } from "react";
import type { Question, Organization } from "@shared/generated/client";
import { getColorWithOpacity } from "@/app/utils/color";

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
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.6,
  );

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRangeSelectionValue(Number(event.target.value));
  };

  if (question.lowRange === null || question.highRange === null) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="flex w-full max-w-full flex-col items-center gap-2 px-2 py-4">
        <input
          type="range"
          min={question.lowRange}
          max={question.highRange}
          value={rangeSelectionValue ?? question.lowRange}
          onChange={handleSliderChange}
          className="w-full max-w-md"
          style={{
            background: `linear-gradient(to right, ${newColor} 0%, ${selectedColor} ${((rangeSelectionValue ?? question.lowRange) / (question.highRange - question.lowRange)) * 100}%, ${newColor} ${((rangeSelectionValue ?? question.lowRange) / (question.highRange - question.lowRange)) * 100}%, ${newColor} 100%)`,
          }}
        />
        <div className="flex w-full max-w-md justify-between text-sm text-neutral-500">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
        <div className="mt-2 text-lg font-semibold">{rangeSelectionValue}</div>
      </div>
    </div>
  );
};
