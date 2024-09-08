"use client";

import { usePathname, useParams } from "next/navigation";
import { INNER_SIDEBAR_ROUTES } from "./sidebarRoutes";
import SidebarSection from "./SidebarSection";
import { api } from "@/trpc/react";
import { Study } from "@shared/generated/client";
import { Button } from "@/components/ui/button";
import { TestTube } from "@phosphor-icons/react";

const resolveCurrentRoute = (pathname: string) => {
  switch (pathname.split("/").pop()) {
    case "results":
      return "Results";
    case "codebook":
      return "Codebook";
    case "approve-codes":
      return "Approve Codes";
    case "distribution":
      return "Distribution";
    default:
      return "Overview";
  }
};

function TopContent({ study }: { study: Study }) {
  const pathname = usePathname();
  const currentRoute = pathname.split("/").pop() ?? "";

  return (
    <div className="bg-theme-50 flex w-full items-center justify-between p-4">
      <h2 className="text-theme-900 text-xl font-semibold">
        {study?.title}{" "}
        <span className="text-theme-600 font-light">
          {" "}
          - {resolveCurrentRoute(pathname)}
        </span>
      </h2>
      <Button className="text-theme-off-white flex gap-2">
        <TestTube className="text-theme-off-white" />
        Test Study
      </Button>
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
            key={section.title ?? `section-${index}`}
            title={section.items ? section.title : undefined}
            items={
              section.items ?? [{ title: section.title, path: section.path }]
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
