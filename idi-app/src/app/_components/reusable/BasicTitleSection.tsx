import React from "react";

interface BasicTitleSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function BasicTitleSection({
  title,
  subtitle,
  children,
}: BasicTitleSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-base font-semibold text-theme-900">{title}</div>
      {subtitle && (
        <div className="mb-4 text-sm text-theme-600">{subtitle}</div>
      )}
      {children}
    </div>
  );
}
