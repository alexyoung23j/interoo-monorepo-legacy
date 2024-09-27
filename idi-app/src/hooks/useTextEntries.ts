import type { TextEntry } from "@/app/_components/reusable/TextEntryGroup";
import { useState, useCallback, useEffect } from "react";

export const useTextEntries = (
  initialEntries: TextEntry[] = [],
  showField2 = false,
  onChange?: (entries: TextEntry[]) => void,
) => {
  const [entries, setEntries] = useState<TextEntry[]>(initialEntries);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const addEntry = useCallback(() => {
    const newEntry: TextEntry = {
      id: Date.now().toString(),
      field1: "",
      field2: showField2 ? "" : undefined,
    };
    setEntries((prevEntries) => {
      const newEntries = [...prevEntries, newEntry];
      onChange?.(newEntries);
      return newEntries;
    });
  }, [onChange, showField2]);

  const removeEntry = useCallback(
    (id: string) => {
      setEntries((prevEntries) => {
        const newEntries = prevEntries.filter((entry) => entry.id !== id);
        onChange?.(newEntries);
        return newEntries;
      });
    },
    [onChange],
  );

  const updateEntries = useCallback(
    (newEntries: TextEntry[]) => {
      setEntries(newEntries);
      onChange?.(newEntries);
    },
    [onChange],
  );

  return {
    entries,
    addEntry,
    removeEntry,
    updateEntries,
  };
};
