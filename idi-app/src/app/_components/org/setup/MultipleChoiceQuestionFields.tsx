import React from "react";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import TextEntryGroup, {
  TextEntry,
} from "@/app/_components/reusable/TextEntryGroup";
import { useTextEntries } from "@/hooks/useTextEntries";

type MultipleChoiceQuestionFieldsProps = {
  options: TextEntry[];
  onChange: (updatedOptions: TextEntry[]) => void;
  error?: string;
};

const MultipleChoiceQuestionFields: React.FC<
  MultipleChoiceQuestionFieldsProps
> = ({ options, onChange, error }) => {
  const {
    entries: multipleChoiceOptions,
    addEntry,
    removeEntry,
    updateEntries,
  } = useTextEntries(options, false, onChange);

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
      {error && <div className="mt-1 text-sm text-red-500">{error}</div>}
    </BasicTitleSection>
  );
};

export default React.memo(MultipleChoiceQuestionFields);
