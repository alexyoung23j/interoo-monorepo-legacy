import type { TextEntry } from "@/app/_components/reusable/TextEntryGroup";
import { useState, useCallback, useEffect } from "react";

export const useTextEntries = (
  initialEntries: TextEntry[] = [],
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
      field2: "",
    };
    setEntries((prevEntries) => {
      const newEntries = [...prevEntries, newEntry];
      onChange?.(newEntries);
      return newEntries;
    });
  }, [onChange]);

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
