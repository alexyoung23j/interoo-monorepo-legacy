"use client";

import { CaretDown } from "@phosphor-icons/react";
import SidebarItem from "./SidebarItem";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface RouteItem {
  title: string;
  path: string;
  allowedWhenDraft: boolean;
  featureFlagsRequired: string[];
}

interface SidebarSectionProps {
  title?: string;
  items?: RouteItem[];
  currentPath: string;
  orgId: string;
  studyId?: string;
  isDraft?: boolean;
  allowedWhenDraft?: boolean;
}

export default function SidebarSection({
  title,
  items,
  currentPath,
  orgId,
  studyId,
  isDraft,
  allowedWhenDraft,
}: SidebarSectionProps) {
  const { isFeatureEnabled } = useFeatureFlags(orgId);

  const renderItem = (item: RouteItem) => {
    const itemPath = item.path
      .replace("[orgId]", orgId)
      .replace("[studyId]", studyId ?? "");

    const isFlaggedOn =
      item.featureFlagsRequired?.length === 0 ||
      (item.featureFlagsRequired?.length > 0 &&
        item.featureFlagsRequired?.every((flag) => isFeatureEnabled(flag)));

    if (!isFlaggedOn) {
      return null;
    }

    return (
      <SidebarItem
        key={item.path}
        title={item.title}
        path={itemPath}
        isActive={currentPath === itemPath}
        orgId={orgId}
        studyId={studyId}
        isDraft={isDraft && !item.allowedWhenDraft}
      />
    );
  };

  if (!items) {
    return null;
  }

  return (
    <div className="w-full empty:hidden">
      {title && (
        <h3
          className={`mb-1 flex items-center justify-between py-[6px] pl-2 text-sm font-medium text-theme-900 ${
            !isDraft || (isDraft && allowedWhenDraft) ? "" : "opacity-50"
          }`}
        >
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
