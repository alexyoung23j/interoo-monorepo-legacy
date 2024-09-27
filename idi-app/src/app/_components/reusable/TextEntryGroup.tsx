import React from "react";
import BasicInput from "./BasicInput";
import { Button } from "@/components/ui/button";
import { Plus, X } from "@phosphor-icons/react";

export interface TextEntry {
  field1: string;
  field2?: string;
  id: string;
  field1Percentage?: number;
}

interface TextEntryGroupProps {
  entries: TextEntry[];
  onRemove: (id: string) => void;
  onAdd: () => void;
  addText: string;
  onChange: (entries: TextEntry[]) => void;
  field1Placeholder?: string;
  field2Placeholder?: string;
}

const TextEntryGroup: React.FC<TextEntryGroupProps> = ({
  entries,
  onRemove,
  onAdd,
  addText,
  onChange,
  field1Placeholder = "Enter Word",
  field2Placeholder = "Enter Description (optional)",
}) => {
  const handleSetValue = (
    id: string,
    field: "field1" | "field2",
    value: string,
  ) => {
    const updatedEntries = entries.map((entry) =>
      entry.id === id ? { ...entry, [field]: value } : entry,
    );
    onChange(updatedEntries);
  };

  return (
    <div className="flex w-full flex-col justify-start gap-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex w-full flex-row items-center gap-2">
          <div className="flex flex-1 flex-row gap-2">
            <BasicInput
              value={entry.field1 ?? ""}
              onSetValue={(value) => handleSetValue(entry.id, "field1", value)}
              placeholder={field1Placeholder}
              className={`${
                entry.field2 !== undefined
                  ? `w-[${entry.field1Percentage ?? 25}%]`
                  : "w-full flex-1"
              }`}
            />
            {entry.field2 !== undefined && (
              <BasicInput
                value={entry.field2 ?? ""}
                onSetValue={(value) =>
                  handleSetValue(entry.id, "field2", value)
                }
                placeholder={field2Placeholder}
                className="flex-1"
              />
            )}
          </div>
          <Button
            onClick={() => onRemove(entry.id)}
            variant="unstyled"
            size="icon"
            className="text-theme-600 hover:text-theme-900"
          >
            <X size={20} />
          </Button>
        </div>
      ))}
      <Button
        onClick={onAdd}
        variant="unstyled"
        className="flex gap-2 text-theme-600 hover:text-theme-900"
      >
        <Plus size={20} />
        {addText}
      </Button>
    </div>
  );
};

export default TextEntryGroup;
