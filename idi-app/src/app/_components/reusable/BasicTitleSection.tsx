import React from "react";

interface BasicTitleSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
}

export default function BasicTitleSection({
  title,
  subtitle,
  children,
  titleClassName,
  subtitleClassName,
}: BasicTitleSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`text-base font-semibold text-theme-900 ${titleClassName}`}
      >
        {title}
      </div>
      {subtitle && (
        <div className={`mb-2 text-sm text-theme-600 ${subtitleClassName}`}>
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
}
