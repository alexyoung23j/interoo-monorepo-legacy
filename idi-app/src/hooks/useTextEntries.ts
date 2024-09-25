import type { TextEntry } from "@/app/_components/reusable/TextEntryGroup";
import { useState, useCallback } from "react";

export const useTextEntries = (initialEntries: TextEntry[] = []) => {
  const [entries, setEntries] = useState<TextEntry[]>(initialEntries);

  const addEntry = useCallback(() => {
    const newEntry: TextEntry = {
      id: Date.now().toString(),
      field1: "",
      field2: "",
    };
    setEntries((prevEntries) => [...prevEntries, newEntry]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
  }, []);

  const updateEntries = useCallback((newEntries: TextEntry[]) => {
    setEntries(newEntries);
  }, []);

  return {
    entries,
    addEntry,
    removeEntry,
    updateEntries,
  };
};
