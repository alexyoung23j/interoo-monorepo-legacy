import React, { useState, useEffect } from "react";
import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicSelect from "@/app/_components/reusable/BasicSelect";
import BasicTextArea from "@/app/_components/reusable/BasicTextArea";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import { QuestionType, FollowUpLevel } from "@shared/generated/client";

export type LocalQuestion = {
  id?: string;
  title: string;
  body?: string;
  questionType: QuestionType | undefined;
  followUpLevel: FollowUpLevel | undefined;
  shouldFollowUp: boolean | undefined;
  context?: string;
  questionOrder: number;
  hasStimulus: boolean;
  allowMultipleSelections?: boolean;
  lowRange?: number;
  highRange?: number;
  // Add any other fields that are relevant for local manipulation
};

type QuestionSetupSectionProps = {
  question: LocalQuestion;
  onValidationChange: (isValid: boolean) => void;
  onChange: (updatedQuestion: LocalQuestion) => void;
};

const QuestionSetupSection: React.FC<QuestionSetupSectionProps> = ({
  question,
  onValidationChange,
  onChange,
}) => {
  const [localQuestion, setLocalQuestion] = useState<LocalQuestion>(question);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    validateQuestion();
  }, [localQuestion]);

  const validateQuestion = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!localQuestion.title.trim()) {
      newErrors.title = "Question is required";
      isValid = false;
    }

    if (!localQuestion.questionType) {
      newErrors.questionType = "Question type is required";
      isValid = false;
    }

    // Add more validation rules as needed

    setErrors(newErrors);
    onValidationChange(isValid);
    return isValid;
  };

  const handleInputChange = (field: keyof LocalQuestion) => (value: string) => {
    const updatedQuestion: LocalQuestion = { ...localQuestion, [field]: value };
    setLocalQuestion(updatedQuestion);
    onChange(updatedQuestion);
  };

  const handleSelectChange =
    (field: keyof LocalQuestion) => (value: string) => {
      let typedValue: QuestionType | FollowUpLevel | undefined;
      if (field === "questionType") {
        typedValue = value as QuestionType;
      } else if (field === "followUpLevel") {
        typedValue = value as FollowUpLevel;
      } else {
        return; // Exit if the field is neither questionType nor followUpLevel
      }

      const updatedQuestion: LocalQuestion = {
        ...localQuestion,
        [field]: typedValue,
      };
      setLocalQuestion(updatedQuestion);
      onChange(updatedQuestion);
    };

  const renderOpenEndedFields = () => (
    <>
      <BasicTitleSection
        title="Follow Up Settings"
        titleClassName="!font-medium"
        subtitleClassName="!font-normal"
      >
        <BasicSelect
          options={Object.values(FollowUpLevel).map((level) => ({
            value: level,
            label: level,
          }))}
          placeholder="Select follow up setting"
          value={localQuestion.followUpLevel ?? ""}
          onValueChange={handleSelectChange("followUpLevel")}
        />
      </BasicTitleSection>

      <BasicTitleSection
        title="Context and Instructions"
        subtitle="Include context to provide the AI with information about how to follow up, key areas of interest, goals of the question, etc. The quality of follow ups will be greatly enhanced by writing detailed question context."
        titleClassName="!font-medium"
        subtitleClassName="!font-normal"
      >
        <BasicTextArea
          placeholder="Enter goals"
          rows={6}
          className="w-full"
          value={localQuestion.context ?? ""}
          onSetValue={handleInputChange("context")}
        />
      </BasicTitleSection>
    </>
  );

  const renderMultipleChoiceFields = () => (
    <>
      <BasicTitleSection
        title="Allow Multiple Selections"
        titleClassName="!font-medium"
        subtitleClassName="!font-normal"
      >
        <BasicSelect
          options={[
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]}
          placeholder="Allow multiple selections?"
          value={localQuestion.allowMultipleSelections?.toString() ?? ""}
          onValueChange={(value) =>
            handleInputChange("allowMultipleSelections")(
              value === "true" ? "true" : "false",
            )
          }
        />
      </BasicTitleSection>
      {/* Add fields for multiple choice options here */}
    </>
  );

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-theme-200 bg-theme-50 p-6">
      <div className="text-lg font-medium text-theme-600">
        {`Question ${(localQuestion.questionOrder ?? 0) + 1}`}
      </div>
      <div className="h-[1px] w-full bg-theme-200" />

      <BasicTitleSection
        title="Question*"
        titleClassName="!font-medium"
        subtitleClassName="!font-normal"
      >
        <BasicInput
          type="text"
          placeholder="Enter question"
          value={localQuestion.title}
          onSetValue={handleInputChange("title")}
        />
        {errors.title && (
          <div className="mt-1 text-sm text-red-500">{errors.title}</div>
        )}
      </BasicTitleSection>

      <BasicTitleSection
        title="Question Type*"
        titleClassName="!font-medium"
        subtitleClassName="!font-normal"
      >
        <BasicSelect
          options={Object.values(QuestionType)
            .filter((type) => type !== QuestionType.RANGE)
            .map((type) => ({
              value: type,
              label: (() => {
                switch (type) {
                  case QuestionType.OPEN_ENDED:
                    return "Open-Ended";
                  case QuestionType.MULTIPLE_CHOICE:
                    return "Multiple Choice";
                  default:
                    return type;
                }
              })(),
            }))}
          placeholder="Select question type"
          value={localQuestion.questionType ?? ""}
          onValueChange={handleSelectChange("questionType")}
        />
        {errors.questionType && (
          <div className="mt-1 text-sm text-red-500">{errors.questionType}</div>
        )}
      </BasicTitleSection>

      {localQuestion.questionType === QuestionType.OPEN_ENDED &&
        renderOpenEndedFields()}
      {localQuestion.questionType === QuestionType.MULTIPLE_CHOICE &&
        renderMultipleChoiceFields()}

      {/* Add more fields as needed */}
    </div>
  );
};

export default QuestionSetupSection;
