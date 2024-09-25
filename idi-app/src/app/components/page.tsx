"use client";

import React, { useState, useCallback, useEffect } from "react";
import SimpleLayout from "../_components/layouts/SimpleLayout";
import QuoteTextField, {
  type HighlightReference,
} from "../_components/reusable/QuoteTextField";
import { mockHighlights, mockTranscriptBlob } from "../utils/mockData";

const ComponentsPage: React.FC = () => {
  const [highlights, setHighlights] =
    useState<HighlightReference[]>(mockHighlights);
  const [activeHighlight, setActiveHighlight] =
    useState<HighlightReference | null>(null);
  const [editHighlight, setEditHighlight] = useState<HighlightReference | null>(
    null,
  );
  const [editMode, setEditMode] = useState(false);

  const handleHighlightClick = useCallback((highlight: HighlightReference) => {
    setActiveHighlight(highlight);
  }, []);

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  useEffect(() => {
    if (highlights[0] !== undefined) {
      setActiveHighlight(highlights[0]);
      setEditHighlight(highlights[0]);
    }
  }, [highlights]);

  return (
    <SimpleLayout showLogo={true}>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-8">
        <h1 className="mb-4 text-2xl font-bold text-theme-900">
          Transcript Renderer Demo
        </h1>

        <div className="flex w-full flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-theme-900">Display Mode</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {highlights.map((highlight, index) => (
              <button
                key={highlight.id}
                onClick={() => handleHighlightClick(highlight)}
                className={`rounded px-4 py-2 transition-colors ${
                  activeHighlight?.id === highlight.id
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
            highlight={activeHighlight}
            className="text-theme-900"
            editMode={false}
          />
        </div>

        <div className="flex w-full flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-theme-900">
            Editable Mode
          </h2>
          <button
            onClick={toggleEditMode}
            className="rounded bg-theme-600 px-4 py-2 text-theme-off-white"
          >
            {editMode ? "Disable Edit Mode" : "Enable Edit Mode"}
          </button>
          <QuoteTextField
            transcriptBlob={mockTranscriptBlob}
            highlight={editHighlight}
            className="text-theme-900"
            editMode={editMode}
            onEditCursorReleased={(newHighlight) => {
              setEditHighlight(newHighlight);
            }}
          />
        </div>
      </div>
    </SimpleLayout>
  );
};

export default ComponentsPage;
