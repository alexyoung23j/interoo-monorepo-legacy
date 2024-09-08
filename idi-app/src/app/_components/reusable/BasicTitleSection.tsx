import React from "react";

interface BasicTitleSectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function BasicTitleSection({
  title,
  subtitle,
  children,
}: BasicTitleSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-theme-900 text-base font-semibold">{title}</div>
      <div className="text-theme-600 mb-4 text-sm">{subtitle}</div>
      {children}
    </div>
  );
}
