"use client";

import Link from "next/link";

interface SidebarItemProps {
  title: string;
  path: string;
  isActive: boolean;
  orgId: string;
  studyId?: string;
}

export default function SidebarItem({
  title,
  path,
  isActive,
  orgId,
  studyId,
}: SidebarItemProps) {
  const href = path
    .replace("[orgId]", orgId)
    .replace("[studyId]", studyId ?? "");

  return (
    <Link
      href={href}
      className={`text-theme-900 flex w-full px-2 py-[6px] text-sm font-medium ${isActive ? "bg-theme-off-white shadow-standard border-theme-200 rounded-sm border" : ""}`}
    >
      {title}
    </Link>
  );
}
