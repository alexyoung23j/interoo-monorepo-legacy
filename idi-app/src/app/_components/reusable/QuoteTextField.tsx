import React, { useMemo, useState, useCallback } from "react";
import type { FullTranscriptBlob } from "@shared/types";

export type HighlightReference = {
  id: string;
  startWordIndex: number;
  endWordIndex: number;
  color: string;
};

export type TranscriptRendererProps = {
  transcriptBlob: FullTranscriptBlob;
  highlight: HighlightReference | null;
  className?: string;
  editMode?: boolean;
  onSave?: (newHighlight: HighlightReference) => void;
};

function HighlightedWord({
  word,
  color,
  isStart,
  isEnd,
  onDragStart,
  onDragEnd,
}: {
  word: string;
  color: string;
  isStart: boolean;
  isEnd: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  return (
    <span
      className="relative inline-block"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 0 3px ${color}`,
      }}
    >
      {word}
      {(isStart || isEnd) && (
        <span
          className={`absolute h-4 w-2 cursor-ew-resize bg-theme-600 ${
            isStart ? "left-0" : "right-0"
          } top-1/2 -translate-y-1/2 transform`}
          onMouseDown={isStart ? onDragStart : onDragEnd}
        />
      )}
    </span>
  );
}

export default function QuoteTextField({
  transcriptBlob,
  highlight,
  className = "",
  editMode = false,
  onSave,
}: TranscriptRendererProps) {
  const [localHighlight, setLocalHighlight] =
    useState<HighlightReference | null>(highlight);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);

  const handleDragStart = useCallback(() => {
    setIsDragging("start");
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging("end");
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging && onSave && localHighlight) {
      onSave(localHighlight);
    }
    setIsDragging(null);
  }, [isDragging, onSave, localHighlight]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, globalWordIndex: number) => {
      if (isDragging && localHighlight) {
        setLocalHighlight((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            [isDragging === "start" ? "startWordIndex" : "endWordIndex"]:
              globalWordIndex,
          };
        });
      }
    },
    [isDragging, localHighlight],
  );

  const renderText = useMemo(() => {
    if (!transcriptBlob.transcript) {
      return null;
    }

    const { words, sentences } = transcriptBlob.transcript;
    const content: React.ReactNode[] = [];

    sentences.forEach((sentence, sentenceIndex) => {
      const sentenceWords = words.slice(
        sentence.start_word_index,
        sentence.end_word_index + 1,
      );

      sentenceWords.forEach((word, wordIndex) => {
        const globalWordIndex = sentence.start_word_index + wordIndex;

        if (
          localHighlight &&
          globalWordIndex >= localHighlight.startWordIndex &&
          globalWordIndex <= localHighlight.endWordIndex
        ) {
          content.push(
            <HighlightedWord
              key={`${localHighlight.id}-${globalWordIndex}`}
              word={word.word}
              color={localHighlight.color}
              isStart={
                globalWordIndex === localHighlight.startWordIndex && editMode
              }
              isEnd={
                globalWordIndex === localHighlight.endWordIndex && editMode
              }
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />,
          );
        } else {
          content.push(
            <span
              key={`word-${globalWordIndex}`}
              onMouseMove={(e) => handleMouseMove(e, globalWordIndex)}
            >
              {word.word}
            </span>,
          );
        }
        content.push(" ");
      });

      if (sentence.is_paragraph_end) {
        content.push(<br key={`br-${sentenceIndex}`} />);
        content.push(<br key={`br-${sentenceIndex}-second`} />);
      }
    });

    return content;
  }, [
    transcriptBlob,
    localHighlight,
    editMode,
    handleDragStart,
    handleDragEnd,
    handleMouseMove,
  ]);

  return (
    <div
      className={`${className} select-none whitespace-pre-wrap`}
      onMouseUp={handleMouseUp}
    >
      {renderText}
    </div>
  );
}
