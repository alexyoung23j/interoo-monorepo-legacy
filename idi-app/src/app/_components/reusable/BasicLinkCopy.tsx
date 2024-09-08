import React, { useState, useEffect } from "react";
import { Copy, Check } from "@phosphor-icons/react";
import { showSuccessToast } from "@/app/utils/toastUtils";

interface BasicLinkCopyProps {
  link: string;
  toastString?: string;
}

export function BasicLinkCopy({ link, toastString }: BasicLinkCopyProps) {
  const [copied, setCopied] = useState(false);
  const displayLink = link.replace(/^https?:\/\/(www\.)?/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    if (toastString) {
      showSuccessToast(toastString);
    }
    setCopied(true);
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <div className="bg-theme-50 border-theme-200 flex w-fit flex-row items-center gap-4 rounded-md border p-2">
      <span className="text-theme-900 flex-grow truncate text-sm font-semibold underline">
        {displayLink}
      </span>
      <button
        onClick={handleCopy}
        className="text-theme-500 hover:text-theme-600 ml-2 flex-shrink-0 focus:outline-none"
      >
        {copied ? (
          <Check size={16} weight="bold" className="text-theme-900" />
        ) : (
          <Copy size={16} weight="bold" className="text-theme-900" />
        )}
      </button>
    </div>
  );
}
