import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
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
  onMouseDown,
  dataIndex,
}: {
  word: string;
  color: string;
  isStart: boolean;
  isEnd: boolean;
  onMouseDown: (position: "start" | "end") => void;
  dataIndex: number;
}) {
  return (
    <span
      className="relative inline-block"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 0 3px ${color}`,
      }}
      data-index={dataIndex}
    >
      {word}
      {(isStart || isEnd) && (
        <span
          className={`absolute h-4 w-2 cursor-ew-resize bg-theme-600 ${
            isStart ? "left-0" : "right-0"
          } top-1/2 -translate-y-1/2 transform`}
          onMouseDown={(e) => {
            e.preventDefault();
            onMouseDown(isStart ? "start" : "end");
          }}
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
  const [draggedHandle, setDraggedHandle] = useState<"start" | "end" | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalHighlight(highlight);
  }, [highlight]);

  const handleMouseDown = useCallback((position: "start" | "end") => {
    setDraggedHandle(position);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (draggedHandle && onSave && localHighlight) {
      onSave(localHighlight);
    }
    setDraggedHandle(null);
  }, [draggedHandle, onSave, localHighlight]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedHandle || !localHighlight || !containerRef.current) return;

      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (!range) return;

      const node = range.startContainer;
      let wordElement: HTMLElement | null = null;

      if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        wordElement = node.parentElement;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        wordElement = node as HTMLElement;
      }

      const wordIndex = parseInt(
        wordElement?.getAttribute("data-index") ?? "-1",
      );
      if (wordIndex === -1) return;

      setLocalHighlight((prev) => {
        if (!prev) return null;
        let newStartIndex = prev.startWordIndex;
        let newEndIndex = prev.endWordIndex;

        if (draggedHandle === "start" && wordIndex <= prev.endWordIndex) {
          newStartIndex = wordIndex;
        } else if (
          draggedHandle === "end" &&
          wordIndex >= prev.startWordIndex
        ) {
          newEndIndex = wordIndex;
        }

        if (
          newStartIndex !== prev.startWordIndex ||
          newEndIndex !== prev.endWordIndex
        ) {
          return {
            ...prev,
            startWordIndex: newStartIndex,
            endWordIndex: newEndIndex,
          };
        }
        return prev;
      });
    },
    [draggedHandle, localHighlight],
  );

  const renderText = useMemo(() => {
    if (!transcriptBlob.transcript) return null;

    const { words, sentences } = transcriptBlob.transcript;
    const content: React.ReactNode[] = [];

    const highlightToUse = editMode ? localHighlight : highlight;

    sentences.forEach((sentence, sentenceIndex) => {
      const sentenceWords = words.slice(
        sentence.start_word_index,
        sentence.end_word_index + 1,
      );

      sentenceWords.forEach((word, wordIndex) => {
        const globalWordIndex = sentence.start_word_index + wordIndex;

        if (
          highlightToUse &&
          globalWordIndex >= highlightToUse.startWordIndex &&
          globalWordIndex <= highlightToUse.endWordIndex
        ) {
          content.push(
            <HighlightedWord
              key={`${highlightToUse.id}-${globalWordIndex}`}
              word={word.word}
              color={highlightToUse.color}
              isStart={
                globalWordIndex === highlightToUse.startWordIndex && editMode
              }
              isEnd={
                globalWordIndex === highlightToUse.endWordIndex && editMode
              }
              onMouseDown={handleMouseDown}
              dataIndex={globalWordIndex}
            />,
          );
        } else {
          content.push(
            <span key={`word-${globalWordIndex}`} data-index={globalWordIndex}>
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
  }, [transcriptBlob, localHighlight, editMode, highlight, handleMouseDown]);

  return (
    <div
      ref={containerRef}
      className={`${className} select-none whitespace-pre-wrap`}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
    >
      {renderText}
    </div>
  );
}
