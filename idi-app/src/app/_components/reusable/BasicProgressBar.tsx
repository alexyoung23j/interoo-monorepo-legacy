import React from "react";

interface BasicProgressBarProps {
  value: number; // Value between 0 and 100
}

export function BasicProgressBar({ value }: BasicProgressBarProps) {
  // Ensure the value is between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="flex w-full items-center justify-between">
      <div className="relative h-2 w-full rounded-[1px] bg-theme-100 md:rounded-[2px]">
        <div
          className="absolute h-full rounded-[1px] bg-theme-500 transition-all duration-500 ease-in-out md:rounded-[2px]"
          style={{ width: `${clampedValue}%` }}
        ></div>
      </div>
    </div>
  );
}
