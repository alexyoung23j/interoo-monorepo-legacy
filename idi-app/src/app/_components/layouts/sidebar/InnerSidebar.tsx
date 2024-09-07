"use client";

import { usePathname, useParams } from "next/navigation";
import { INNER_SIDEBAR_ROUTES } from "./sidebarRoutes";
import SidebarSection from "./SidebarSection";

function TopContent() {
  return (
    <div className="bg-theme-50 w-full p-4">
      <h2 className="text-xl font-bold">Study Name - Overview</h2>
    </div>
  );
}

function SideContent() {
  const pathname = usePathname();
  const params = useParams();
  const orgId = params.orgId as string;
  const studyId = params.studyId as string | undefined;

  return (
    <nav className="bg-theme-50 flex w-48 flex-col items-center px-4">
      <div className="bg-theme-200 h-[1px] w-full" />
      <div className="mt-7 flex w-full flex-col items-start gap-1">
        {INNER_SIDEBAR_ROUTES.map((section, index) => (
          <SidebarSection
            key={section.title || `section-${index}`}
            title={section.items ? section.title : undefined}
            items={
              section.items || [{ title: section.title, path: section.path }]
            }
            currentPath={pathname}
            orgId={orgId}
            studyId={studyId}
          />
        ))}
      </div>
    </nav>
  );
}

const InnerSidebar = {
  TopContent,
  SideContent,
};

export default InnerSidebar;
