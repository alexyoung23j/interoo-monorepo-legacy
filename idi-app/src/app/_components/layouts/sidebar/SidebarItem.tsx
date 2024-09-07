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
      className={`block p-2 ${isActive ? "bg-theme-200 font-bold" : ""}`}
    >
      {title}
    </Link>
  );
}
