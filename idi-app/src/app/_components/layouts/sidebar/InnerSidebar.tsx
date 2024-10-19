"use client";

import { usePathname, useParams, useRouter } from "next/navigation";
import { INNER_SIDEBAR_ROUTES } from "./sidebarRoutes";
import SidebarSection from "./SidebarSection";
import { api } from "@/trpc/react";
import { Study, StudyStatus } from "@shared/generated/client";
import { Button } from "@/components/ui/button";
import { TestTube } from "@phosphor-icons/react";

const resolveCurrentRoute = (pathname: string) => {
  switch (pathname.split("/").pop()) {
    case "results":
      return "Results";
    case "interviews":
      return "Interviews";
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
  const router = useRouter();
  const pathname = usePathname();
  const currentRoute = pathname.split("/").pop() ?? "";

  const handleTestStudy = () => {
    if (study?.shortID) {
      window.open(`/study/${study.shortID}?testMode=true`, "_blank");
    }
  };

  const isSetupPage = pathname.includes("/setup/");
  const isButtonDisabled =
    study?.status !== StudyStatus.PUBLISHED || isSetupPage;

  return (
    <div className="flex w-full items-center justify-between bg-theme-50 p-4">
      <h2 className="text-xl font-semibold text-theme-900">
        {study?.title}{" "}
        <span className="font-light text-theme-600">
          {" "}
          - {resolveCurrentRoute(pathname)}
        </span>
      </h2>
      <Button
        className="flex gap-2 text-theme-off-white"
        onClick={handleTestStudy}
        disabled={isButtonDisabled}
      >
        <TestTube className="text-theme-off-white" />
        Test Study
      </Button>
    </div>
  );
}

function SideContent({ isDraft }: { isDraft: boolean }) {
  const pathname = usePathname();
  const params = useParams();
  const orgId = params.orgId as string;
  const studyId = params.studyId as string | undefined;

  return (
    <nav className="flex min-w-48 flex-col items-center bg-theme-50 px-4">
      <div className="h-[1px] w-full bg-theme-200" />
      <div className="mt-7 flex w-full flex-col items-start gap-1">
        {INNER_SIDEBAR_ROUTES.map((section, index) => (
          <SidebarSection
            key={section.title ?? `section-${index}`}
            title={section.items ? section.title : undefined}
            items={
              section.items ?? [
                {
                  title: section.title,
                  path: section.path,
                  allowedWhenDraft: section.allowedWhenDraft,
                  featureFlagsRequired: section.featureFlagsRequired,
                },
              ]
            }
            allowedWhenDraft={section.allowedWhenDraft}
            currentPath={pathname}
            orgId={orgId}
            studyId={studyId}
            isDraft={isDraft}
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
