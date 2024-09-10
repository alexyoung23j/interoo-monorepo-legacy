import React from "react";
import { Button } from "@/components/ui/button";
import type { Question, Organization } from "@shared/generated/client";
import { getColorWithOpacity } from "@/app/utils/color";
import { cx } from "@/tailwind/styling";

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
  multipleChoiceOptionSelectionId: string | null;
  setMultipleChoiceOptionSelectionId: (id: string | null) => void;
}

export const MultipleChoiceSelect: React.FC<MultipleChoiceSelectProps> = ({
  question,
  organization,
  isBackgroundLight,
  multipleChoiceOptionSelectionId,
  setMultipleChoiceOptionSelectionId,
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

  const handleSelection = (optionId: string) => {
    setMultipleChoiceOptionSelectionId(
      multipleChoiceOptionSelectionId === optionId ? null : optionId,
    );
  };

  if (
    !question.multipleChoiceOptions ||
    question.multipleChoiceOptions.length === 0
  ) {
    return null;
  }

  return (
    <div className="scrollbar-thin flex h-max w-full flex-col items-center justify-center gap-3 overflow-y-auto p-1">
      <div className="text-sm text-black opacity-50">Select One</div>
      <div className="flex flex-col gap-3">
        {question.multipleChoiceOptions.map((option) => (
          <Button
            key={option.id}
            variant="unstyled"
            className={cx(
              "flex h-fit min-h-12 w-full max-w-md gap-3 text-wrap rounded-[1px] border border-black border-opacity-50 text-black transition-colors",
              {
                "bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)]":
                  multipleChoiceOptionSelectionId !== option.id,
                "bg-[var(--button-selected-bg)]":
                  multipleChoiceOptionSelectionId === option.id,
              },
            )}
            onClick={() => handleSelection(option.id)}
            style={
              {
                "--button-bg": newColor,
                "--button-selected-bg": selectedColor,
                "--button-hover-bg": hoverColor,
              } as React.CSSProperties
            }
          >
            <span className="flex-grow text-wrap text-left">
              {option.optionText}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};
