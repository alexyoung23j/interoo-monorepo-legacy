import React from "react";
import { Button } from "@/components/ui/button";
import type {
  Question,
  InterviewSession,
  Organization,
} from "@shared/generated/client";
import { getColorWithOpacity, isColorLight } from "@/app/utils/color";

interface MultipleChoiceSelectProps {
  question: Question & {
    multipleChoiceOptions?: {
      id: string;
      optionText: string;
      optionOrder: number;
    }[];
  };
  organization: Organization;
  isBackgroundLight: boolean;
  multipleChoiceOptionSelectionId: string;
  setMultipleChoiceOptionSelectionId: (id: string) => void;
}

export const MultipleChoiceSelect: React.FC<MultipleChoiceSelectProps> = ({
  question,
  organization,
  isBackgroundLight,
}) => {
  const newColor = getColorWithOpacity(organization.secondaryColor ?? "", 0.15);
  const selectedColor = getColorWithOpacity(
    organization.secondaryColor ?? "",
    0.4,
  );

  const handleSelection = (optionId: string) => {
    // TODO: Implement selection logic
    console.log("Selected option:", optionId);
  };

  if (
    !question.multipleChoiceOptions ||
    question.multipleChoiceOptions.length === 0
  ) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-start gap-3">
      <div className="text-sm text-black opacity-50">
        {question.allowMultipleSelections ? "select multiple" : "select one"}
      </div>
      <div className="flex max-h-80 w-fit min-w-[70%] flex-col items-center justify-start gap-3 overflow-y-auto px-2 py-4 scrollbar-hide">
        {question.multipleChoiceOptions.map((option) => (
          <Button
            key={option.id}
            variant="unstyled"
            className={`flex min-h-12 w-full max-w-md gap-3 rounded-[1px] border border-black border-opacity-50 bg-[var(--button-bg)] text-black transition-colors hover:bg-[var(--button-hover-bg)]`}
            onClick={() => handleSelection(option.id)}
            style={
              {
                "--button-bg": newColor,
                "--button-hover-bg": selectedColor,
              } as React.CSSProperties
            }
          >
            <span className="flex-grow text-left">{option.optionText}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
