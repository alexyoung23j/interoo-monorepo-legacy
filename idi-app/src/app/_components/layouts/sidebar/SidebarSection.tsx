"use client";

import { CaretDown } from "@phosphor-icons/react";
import SidebarItem from "./SidebarItem";

interface RouteItem {
  title: string;
  path: string;
}

interface SidebarSectionProps {
  title?: string;
  items?: RouteItem[];
  currentPath: string;
  orgId: string;
  studyId?: string;
}

export default function SidebarSection({
  title,
  items,
  currentPath,
  orgId,
  studyId,
}: SidebarSectionProps) {
  const renderItem = (item: RouteItem) => {
    const itemPath = item.path
      .replace("[orgId]", orgId)
      .replace("[studyId]", studyId ?? "");

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
  };

  if (!items) {
    return null;
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-theme-900 mb-1 flex items-center justify-between py-[6px] pl-2 text-sm font-medium">
          {title}
          <CaretDown size={16} className="text-theme-900" />
        </h3>
      )}
      {title ? (
        <div className="flex flex-col gap-1 pl-2">{items.map(renderItem)}</div>
      ) : (
        items.map(renderItem)
      )}
    </div>
  );
}
