import React, { useState, useEffect, useCallback } from "react";
import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicSelect from "@/app/_components/reusable/BasicSelect";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import {
  QuestionType,
  FollowUpLevel,
  ImageStimulus,
  VideoStimulus,
  WebsiteStimulus,
} from "@shared/generated/client";
import BasicPopover from "../../reusable/BasicPopover";
import { DotsThree, Trash } from "@phosphor-icons/react";
import OpenEndedQuestionFields from "./OpenEndedQuestionFields";
import MultipleChoiceQuestionFields from "./MultipleChoiceQuestionFields";
import { TextEntry } from "@/app/_components/reusable/TextEntryGroup";
import BasicTextArea from "../../reusable/BasicTextArea";

export type LocalImageStimulus = {
  id?: string;
  bucketUrl: string;
  title?: string;
  altText?: string;
};

export type LocalVideoStimulus = {
  id?: string;
  url: string;
  type: "UPLOADED" | "EXTERNAL";
  title?: string;
};

export type LocalWebsiteStimulus = {
  id?: string;
  websiteUrl: string;
  title?: string;
};

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
  stimulusType?: "None" | "Images" | "Videos" | "Websites";
  allowMultipleSelections?: boolean;
  lowRange?: number;
  highRange?: number;
  imageStimuli: LocalImageStimulus[];
  videoStimuli: LocalVideoStimulus[];
  websiteStimuli: LocalWebsiteStimulus[];
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

    if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
      if (
        !question.multipleChoiceOptions ||
        question.multipleChoiceOptions.length < 2
      ) {
        newErrors.multipleChoiceOptions = "At least 2 options are required";
        isValid = false;
      }
    }

    setErrors(newErrors);
    onValidationChange(isValid, index);
    return isValid;
  }, [question, onValidationChange, index]);

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
      let typedValue: QuestionType | undefined;
      if (field === "questionType") {
        typedValue = value as QuestionType;
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

  const handleMultipleChoiceChange = useCallback(
    (updatedOptions: TextEntry[]) => {
      onChange({ ...question, multipleChoiceOptions: updatedOptions });
    },
    [onChange, question],
  );

  return (
    <div className="flex flex-col gap-6 rounded-sm border border-theme-200 bg-theme-50 p-6 shadow-standard">
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
        <BasicTextArea
          placeholder="Enter question"
          value={question.title}
          onSetValue={handleInputChange("title")}
          rows={2}
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
                    return "Open Ended (Free Response)";
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

      {question.questionType === QuestionType.OPEN_ENDED && (
        <OpenEndedQuestionFields question={question} onChange={onChange} />
      )}
      {question.questionType === QuestionType.MULTIPLE_CHOICE && (
        <MultipleChoiceQuestionFields
          options={question.multipleChoiceOptions ?? []}
          onChange={handleMultipleChoiceChange}
          error={errors.multipleChoiceOptions}
        />
      )}
    </div>
  );
};

export default React.memo(QuestionSetupSection);
