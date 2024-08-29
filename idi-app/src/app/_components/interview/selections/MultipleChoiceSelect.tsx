import React from "react";
import { Button } from "@/components/ui/button";
import type {
  Question,
  InterviewSession,
  Organization,
} from "@shared/generated/client";
import { getColorWithOpacity, isColorLight } from "@/app/utils/color";
import { cx } from "@/tailwind/styling";

interface MultipleChoiceSelectProps {
  question: Question & {
    multipleChoiceOptions?: {
      id: string;
      optionText: string;
      optionOrder: number;
    }[];
  };
  interviewSession: InterviewSession;
  organization: Organization;
  isBackgroundLight: boolean;
  multipleChoiceOptionSelectionId: string | null;
  setMultipleChoiceOptionSelectionId: (id: string | null) => void;
}

export const MultipleChoiceSelect: React.FC<MultipleChoiceSelectProps> = ({
  question,
  interviewSession,
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
    0.4,
  );

  const handleSelection = (optionId: string) => {
    setMultipleChoiceOptionSelectionId(optionId);
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
            className={cx(
              "flex min-h-12 w-full max-w-md gap-3 rounded-[1px] border border-black border-opacity-50 text-black transition-colors",
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
            <span className="flex-grow text-left">{option.optionText}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
