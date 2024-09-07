"use client";

import { usePathname, useParams } from "next/navigation";
import { INNER_SIDEBAR_ROUTES } from "./sidebarRoutes";
import SidebarSection from "./SidebarSection";

function TopContent() {
  return (
    <div className="bg-theme-100 w-full p-4">
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
    <nav className="bg-theme-100 w-64">
      {INNER_SIDEBAR_ROUTES.map((section) => (
        <SidebarSection
          key={section.title}
          title={section.title}
          items={section.items}
          currentPath={pathname}
          orgId={orgId}
          studyId={studyId}
        />
      ))}
    </nav>
  );
}

const InnerSidebar = {
  TopContent,
  SideContent,
};

export default InnerSidebar;
