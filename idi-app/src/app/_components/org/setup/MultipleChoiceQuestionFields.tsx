import React from "react";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import TextEntryGroup, {
  TextEntry,
} from "@/app/_components/reusable/TextEntryGroup";
import { useTextEntries } from "@/hooks/useTextEntries";
import { LocalQuestion } from "./QuestionSetupSection";

type MultipleChoiceQuestionFieldsProps = {
  question: LocalQuestion;
  onChange: (updatedQuestion: LocalQuestion) => void;
  errors: Record<string, string>;
};

const MultipleChoiceQuestionFields: React.FC<
  MultipleChoiceQuestionFieldsProps
> = ({ question, onChange, errors }) => {
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

  return (
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
  );
};

export default React.memo(MultipleChoiceQuestionFields);
