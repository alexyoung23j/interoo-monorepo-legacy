"use client";

import SidebarItem from "./SidebarItem";

interface SidebarSectionProps {
  title: string;
  items: Array<{ title: string; path: string }>;
  currentPath: string;
  orgId: string;
  studyId?: string; // Make studyId optional
}

export default function SidebarSection({
  title,
  items,
  currentPath,
  orgId,
  studyId,
}: SidebarSectionProps) {
  return (
    <div className="mb-4">
      <h3 className="text-theme-700 px-4 py-2 font-semibold">{title}</h3>
      {items.map((item) => {
        const itemPath = item.path
          .replace("[orgId]", orgId)
          .replace("[studyId]", studyId || "");

        return (
          <SidebarItem
            key={item.path}
            title={item.title}
            path={itemPath}
            isActive={currentPath === itemPath}
            orgId={orgId}
            studyId={studyId}
          />
        );
      })}
    </div>
  );
}
