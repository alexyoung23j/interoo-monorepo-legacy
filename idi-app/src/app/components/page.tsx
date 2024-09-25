"use client";

import React, { useState, useCallback, useEffect } from "react";
import SimpleLayout from "../_components/layouts/SimpleLayout";
import QuoteTextField, {
  type HighlightReference,
} from "../_components/reusable/QuoteTextField";
import { mockHighlights, mockTranscriptBlob } from "../utils/mockData";

const ComponentsPage: React.FC = () => {
  const [editMode, setEditMode] = useState(false);
  const [highlights, setHighlights] = useState(mockHighlights);
  const [activeHighlight, setActiveHighlight] = useState<
    (typeof mockHighlights)[0] | null
  >(null);
  const [editingHighlight, setEditingHighlight] = useState<
    (typeof mockHighlights)[0] | null
  >(null);

  // const handleSave = useCallback(
  //   (updatedHighlight: Omit<Highlight, "isActive">) => {
  //     setHighlights((prevHighlights) =>
  //       prevHighlights.map((h) =>
  //         h.id === updatedHighlight.id
  //           ? { ...updatedHighlight, isActive: h.isActive }
  //           : h,
  //       ),
  //     );
  //     setEditingHighlight(null);
  //     setEditMode(false);
  //   },
  //   [],
  // );

  const handleHighlightClick = useCallback(
    (highlight: (typeof mockHighlights)[0]) => {
      if (editMode) {
        setEditingHighlight(highlight);
      } else {
        setActiveHighlight(highlight);
      }
    },
    [editMode],
  );

  const handleEditModeToggle = useCallback(() => {
    setEditMode((prev) => !prev);
    setEditingHighlight(null);
    setActiveHighlight(null);
  }, []);

  console.log({ highlights });

  return (
    <SimpleLayout showLogo={true}>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4">
        <h1 className="mb-4 text-2xl font-bold text-theme-900">
          Transcript Renderer Demo
        </h1>
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={handleEditModeToggle}
            className="rounded bg-theme-600 px-4 py-2 text-theme-off-white"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
          {highlights.map((highlight, index) => (
            <button
              key={highlight.id}
              onClick={() => handleHighlightClick(highlight)}
              className={`rounded px-4 py-2 transition-colors ${
                activeHighlight?.id === highlight.id ||
                editingHighlight?.id === highlight.id
                  ? "bg-theme-400 text-theme-900"
                  : "bg-theme-300 text-theme-900 hover:bg-theme-400"
              }`}
            >
              Highlight {index + 1}
            </button>
          ))}
        </div>
        <QuoteTextField
          transcriptBlob={mockTranscriptBlob}
          highlight={editingHighlight ?? activeHighlight}
          className="text-theme-900"
          editMode={editMode && editingHighlight !== null}
        />
      </div>
    </SimpleLayout>
  );
};

export default ComponentsPage;
