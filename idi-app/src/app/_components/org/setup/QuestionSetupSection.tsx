import React, { useState, useEffect, useCallback, useMemo } from "react";
import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicSelect from "@/app/_components/reusable/BasicSelect";
import BasicTextArea from "@/app/_components/reusable/BasicTextArea";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import TextEntryGroup, {
  TextEntry,
} from "@/app/_components/reusable/TextEntryGroup";
import { useTextEntries } from "@/hooks/useTextEntries";
import {
  QuestionType,
  FollowUpLevel,
  ImageStimulus,
  VideoStimulus,
  WebsiteStimulus,
} from "@shared/generated/client";
import { on } from "events";
import BasicPopover from "../../reusable/BasicPopover";
import { DotsThree, Trash } from "@phosphor-icons/react";

export type LocalQuestion = {
  id?: string;
  title: string;
  body?: string;
  questionType: QuestionType;
  followUpLevel: FollowUpLevel;
  shouldFollowUp: boolean;
  context?: string;
  questionOrder: number;
  hasStimulus: boolean;
  allowMultipleSelections?: boolean;
  lowRange?: number;
  highRange?: number;
  imageStimuli?: ImageStimulus[];
  videoStimuli?: VideoStimulus[];
  websiteStimuli?: WebsiteStimulus[];
  multipleChoiceOptions?: TextEntry[];
  isNew?: boolean;
};

type QuestionSetupSectionProps = {
  question: LocalQuestion;
  onValidationChange: (isValid: boolean, questionIndex: number) => void;
  onChange: (updatedQuestion: LocalQuestion) => void;
  onDelete: (questionIndex: number) => void;
  index: number;
};

const QuestionSetupSection: React.FC<QuestionSetupSectionProps> = ({
  question,
  onValidationChange,
  onChange,
  onDelete,

  index,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const {
    entries: multipleChoiceOptions,
    addEntry,
    removeEntry,
    updateEntries,
  } = useTextEntries(
    question.multipleChoiceOptions ?? [],
    false,
    (newEntries) => {
      onChange({ ...question, multipleChoiceOptions: newEntries });
    },
  );

  const validateQuestion = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!question.title.trim()) {
      newErrors.title = "Question is required";
      isValid = false;
    }

    if (!question.questionType) {
      newErrors.questionType = "Question type is required";
      isValid = false;
    }

    if (
      question.questionType === QuestionType.MULTIPLE_CHOICE &&
      multipleChoiceOptions.length < 2
    ) {
      newErrors.multipleChoiceOptions = "At least two options are required";
      isValid = false;
    }

    setErrors(newErrors);
    onValidationChange(isValid, index);
    return isValid;
  }, [question, multipleChoiceOptions, onValidationChange, index]);

  useEffect(() => {
    validateQuestion();
  }, [validateQuestion]);

  const handleInputChange = useCallback(
    (field: keyof LocalQuestion) => (value: string) => {
      onChange({ ...question, [field]: value });
    },
    [onChange, question],
  );

  const handleSelectChange = useCallback(
    (field: keyof LocalQuestion) => (value: string) => {
      let typedValue: QuestionType | FollowUpLevel | undefined;
      if (field === "questionType") {
        typedValue = value as QuestionType;
      } else if (field === "followUpLevel") {
        typedValue = value as FollowUpLevel;
      } else {
        return;
      }

      onChange({ ...question, [field]: typedValue });
    },
    [onChange, question],
  );

  const handleDelete = useCallback(() => {
    onDelete(index);
  }, [onDelete, index]);

  const renderOpenEndedFields = useMemo(
    () => (
      <>
        <BasicTitleSection
          title="Should Follow Up"
          subtitle="If you'd like the AI to ask follow ups, select yes."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <BasicSelect
            options={[
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ]}
            placeholder="Select follow up option"
            value={question.shouldFollowUp ? "true" : "false"}
            onValueChange={(value) =>
              onChange({ ...question, shouldFollowUp: value === "true" })
            }
          />
        </BasicTitleSection>

        {question.shouldFollowUp && (
          <>
            <BasicTitleSection
              title="Follow Up Settings"
              titleClassName="!font-medium"
              subtitleClassName="!font-normal"
            >
              <BasicSelect
                options={Object.values(FollowUpLevel)
                  .filter((level) => level !== FollowUpLevel.AUTOMATIC)
                  .map((level) => ({
                    value: level,
                    label: (() => {
                      switch (level) {
                        case FollowUpLevel.SURFACE:
                          return "Surface Level (1-2 questions)";
                        case FollowUpLevel.LIGHT:
                          return "Deeper Dive (2-3 questions)";
                        case FollowUpLevel.DEEP:
                          return "Comprehensive (3-5 questions)";
                        default:
                          return level;
                      }
                    })(),
                  }))}
                placeholder="Select follow up setting"
                value={question.followUpLevel ?? ""}
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
                value={question.context ?? ""}
                onSetValue={handleInputChange("context")}
              />
            </BasicTitleSection>
          </>
        )}
      </>
    ),
    [question, handleSelectChange, handleInputChange, onChange],
  );

  const renderMultipleChoiceFields = useMemo(
    () => (
      <BasicTitleSection
        title="Multiple Choice Options"
        titleClassName="!font-medium"
        subtitleClassName="!font-normal"
      >
        <TextEntryGroup
          entries={multipleChoiceOptions}
          onRemove={removeEntry}
          onAdd={addEntry}
          addText="Add Option"
          onChange={updateEntries}
          field1Placeholder="Enter option"
        />
        {errors.multipleChoiceOptions && (
          <div className="mt-1 text-sm text-red-500">
            {errors.multipleChoiceOptions}
          </div>
        )}
      </BasicTitleSection>
    ),
    [
      multipleChoiceOptions,
      errors.multipleChoiceOptions,
      removeEntry,
      addEntry,
      updateEntries,
    ],
  );

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-theme-200 bg-theme-50 p-6">
      <div className="flex w-full flex-row items-center justify-between">
        <div className="text-lg font-medium text-theme-600">
          {`Question ${(question.questionOrder ?? 0) + 1}`}
        </div>
        <BasicPopover
          trigger={<DotsThree size={20} />}
          options={[
            {
              text: "Delete this question",
              icon: <Trash />,
              color: "text-red-500",
              onClick: handleDelete,
            },
          ]}
        />
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
          value={question.title}
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
          value={question.questionType ?? ""}
          onValueChange={handleSelectChange("questionType")}
        />
        {errors.questionType && (
          <div className="mt-1 text-sm text-red-500">{errors.questionType}</div>
        )}
      </BasicTitleSection>

      {question.questionType === QuestionType.OPEN_ENDED &&
        renderOpenEndedFields}
      {question.questionType === QuestionType.MULTIPLE_CHOICE &&
        renderMultipleChoiceFields}

      {/* Add more fields as needed */}
    </div>
  );
};

export default React.memo(QuestionSetupSection);
