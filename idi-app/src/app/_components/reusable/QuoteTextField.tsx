import type { FullTranscriptBlob } from "@shared/types";
import React, { useState } from "react";

interface HighlightReference {
  id: string;
  startWordIndex: number;
  endWordIndex: number;
  color: string;
  isActive: boolean;
}

interface TranscriptRendererProps {
  transcriptBlob: FullTranscriptBlob;
  highlights: HighlightReference[];
  editMode: boolean;
  onSave: (updatedHighlights: HighlightReference[]) => void;
  className?: string;
}

const HighlightedText: React.FC<{
  text: string;
  color: string;
  isActive: boolean;
}> = ({ text, color, isActive }) => {
  return (
    <span
      className={`inline-block rounded px-1 ${isActive ? "opacity-100" : "opacity-50"}`}
      style={{ backgroundColor: isActive ? color : "transparent" }}
    >
      {text}
    </span>
  );
};

const EditableHighlight: React.FC<{
  highlight: HighlightReference;
  text: string;
  onChange: (updatedHighlight: HighlightReference) => void;
}> = ({ highlight, text, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleStartDrag = (e: React.MouseEvent, isStart: boolean) => {
    e.preventDefault();
    setIsEditing(true);

    const startX = e.clientX;
    const startIndex = isStart
      ? highlight.startWordIndex
      : highlight.endWordIndex;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = Math.round((moveEvent.clientX - startX) / 10); // Adjust sensitivity as needed
      const newIndex = Math.max(0, startIndex + diff);

      onChange({
        ...highlight,
        [isStart ? "startWordIndex" : "endWordIndex"]: newIndex,
      });
    };

    const handleMouseUp = () => {
      setIsEditing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <span
      className={`relative inline-block rounded px-1 ${isEditing ? "opacity-75" : "opacity-100"}`}
      style={{ backgroundColor: highlight.color }}
    >
      <span
        className="absolute bottom-0 left-0 top-0 w-1 cursor-ew-resize bg-theme-600"
        onMouseDown={(e) => handleStartDrag(e, true)}
      />
      {text}
      <span
        className="absolute bottom-0 right-0 top-0 w-1 cursor-ew-resize bg-theme-600"
        onMouseDown={(e) => handleStartDrag(e, false)}
      />
    </span>
  );
};

const TranscriptRenderer: React.FC<TranscriptRendererProps> = ({
  transcriptBlob,
  highlights,
  editMode,
  onSave,
  className = "",
}) => {
  const [localHighlights, setLocalHighlights] = useState(highlights);

  const renderText = () => {
    const { words, sentences } = transcriptBlob?.transcript ?? {};

    let currentWordIndex = 0;
    let currentHighlightIndex = 0;

    return sentences.map((sentence, sentenceIndex) => {
      const sentenceWords = words.slice(
        sentence.start_word_index,
        sentence.end_word_index + 1,
      );
      const sentenceContent = [];

      sentenceWords.forEach((word, wordIndex) => {
        const globalWordIndex = sentence.start_word_index + wordIndex;
        const currentHighlight = localHighlights[currentHighlightIndex];

        if (
          currentHighlight &&
          globalWordIndex >= currentHighlight.startWordIndex &&
          globalWordIndex <= currentHighlight.endWordIndex
        ) {
          if (globalWordIndex === currentHighlight.startWordIndex) {
            const highlightWords = words.slice(
              currentHighlight.startWordIndex,
              currentHighlight.endWordIndex + 1,
            );
            const highlightText = highlightWords.map((w) => w.word).join(" ");

            sentenceContent.push(
              editMode ? (
                <EditableHighlight
                  key={currentHighlight.id}
                  highlight={currentHighlight}
                  text={highlightText}
                  onChange={(updatedHighlight) =>
                    handleHighlightChange(updatedHighlight)
                  }
                />
              ) : (
                <HighlightedText
                  key={currentHighlight.id}
                  text={highlightText}
                  color={currentHighlight.color}
                  isActive={currentHighlight.isActive}
                />
              ),
            );
          }
          if (globalWordIndex === currentHighlight.endWordIndex) {
            currentHighlightIndex++;
          }
        } else {
          sentenceContent.push(word.word + " ");
        }

        currentWordIndex++;
      });

      return (
        <p
          key={sentenceIndex}
          className={sentence.is_paragraph_end ? "mb-4" : ""}
        >
          {sentenceContent}
        </p>
      );
    });
  };

  const handleHighlightChange = (updatedHighlight: HighlightReference) => {
    setLocalHighlights((prevHighlights) =>
      prevHighlights.map((h) =>
        h.id === updatedHighlight.id ? updatedHighlight : h,
      ),
    );
  };

  const handleSave = () => {
    onSave(localHighlights);
  };

  return (
    <div className="flex flex-col">
      <div className={`rounded-lg bg-theme-50 p-4 ${className}`}>
        {renderText()}
      </div>
      {editMode && (
        <button
          onClick={handleSave}
          className="mt-4 rounded bg-theme-600 px-4 py-2 text-theme-off-white"
        >
          Save Changes
        </button>
      )}
    </div>
  );
};

export default TranscriptRenderer;
