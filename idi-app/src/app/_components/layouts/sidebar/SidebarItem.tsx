"use client";

import Link from "next/link";

interface SidebarItemProps {
  title: string;
  path: string;
  isActive: boolean;
  orgId: string;
  studyId?: string;
  isDraft?: boolean;
}

export default function SidebarItem({
  title,
  path,
  isActive,
  orgId,
  studyId,
  isDraft,
}: SidebarItemProps) {
  const href = path
    .replace("[orgId]", orgId)
    .replace("[studyId]", studyId ?? "");

  const baseClasses = "flex w-full p-2 text-sm font-medium";
  const activeClasses =
    "rounded-sm border border-theme-200 bg-theme-off-white shadow-standard";
  const disabledClasses = "opacity-50 cursor-not-allowed";

  const className = `
    ${baseClasses}
    ${isActive ? activeClasses : ""}
    ${isDraft ? disabledClasses : "text-theme-900"}
  `;

  if (isDraft) {
    return <div className={className}>{title}</div>;
  }

  return (
    <Link href={href} className={className}>
      {title}
    </Link>
  );
}
