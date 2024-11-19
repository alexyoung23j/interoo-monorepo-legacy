/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Terminal, CaretRight, CaretDown, Copy } from "@phosphor-icons/react";

interface LogEntry {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  type: "log" | "error";
  timestamp: string;
  expanded: boolean;
}

const DevLogger = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewLogs, setHasNewLogs] = useState(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatLogContent = (content: any): string => {
    if (typeof content === "undefined") return "undefined";
    if (content === null) return "null";
    if (typeof content === "object") {
      try {
        return JSON.stringify(content, null, 2);
      } catch (e) {
        return String(content);
      }
    }
    return String(content);
  };

  const toggleLogExpansion = (logId: string) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === logId ? { ...log, expanded: !log.expanded } : log,
      ),
    );
  };

  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    const createLogEntry = (args: any[], type: "log" | "error"): LogEntry => ({
      id: Date.now().toString() + Math.random(),
      content: args.length === 1 ? args[0] : args,
      type,
      timestamp: new Date().toLocaleTimeString(),
      expanded: false,
    });

    console.log = (...args) => {
      setLogs((prev) => [createLogEntry(args, "log"), ...prev]);
      setHasNewLogs(true);
      originalConsoleLog.apply(console, args);
    };

    console.error = (...args) => {
      setLogs((prev) => [createLogEntry(args, "error"), ...prev]);
      setHasNewLogs(true);
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copyToClipboard = (content: any) => {
    navigator.clipboard
      .writeText(formatLogContent(content))
      .then(() => {
        console.log("Copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
      });
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setHasNewLogs(false);
        }}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-theme-800 text-theme-off-white shadow-lg transition-all hover:bg-theme-700"
      >
        <Terminal size={24} weight="bold" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex h-[80vh] max-w-[98vw] flex-col gap-4 overflow-hidden bg-theme-200">
          <div className="flex flex-row items-center justify-between border-b border-theme-700 px-6 py-4">
            <DialogTitle className="text-lg font-bold text-theme-900">
              Developer Console
            </DialogTitle>
            <div className="text-xs text-theme-600">
              (latest logs at top of screen)
            </div>
            <button
              onClick={() => setLogs([])}
              className="rounded px-2 py-1 text-sm text-theme-300 hover:bg-theme-700 hover:text-theme-900"
            >
              Clear
            </button>
          </div>
          <div ref={logsContainerRef} className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border-b border-theme-700 py-2 font-mono text-xs"
                >
                  <div className="flex cursor-pointer items-center gap-2">
                    <div
                      className="flex flex-1 items-center gap-2"
                      onClick={() => toggleLogExpansion(log.id)}
                    >
                      {log.expanded ? (
                        <CaretDown size={16} className="text-theme-800" />
                      ) : (
                        <CaretRight size={16} className="text-theme-800" />
                      )}
                      <span className="text-theme-600">{log.timestamp}</span>
                      {log.type === "error" && (
                        <span className="text-red-500">🔴</span>
                      )}
                      <span
                        className={`${
                          log.type === "error"
                            ? "text-red-500"
                            : "text-theme-900"
                        }`}
                      >
                        {!log.expanded &&
                          formatLogContent(log.content).split("\n")[0]}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(log.content);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded hover:bg-theme-300"
                      title="Copy to clipboard"
                    >
                      <Copy size={14} className="text-theme-700" />
                    </button>
                  </div>
                  {log.expanded && (
                    <pre className="ml-6 mt-2 whitespace-pre-wrap break-words text-theme-900">
                      {formatLogContent(log.content)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DevLogger;
