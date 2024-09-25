"use client";

import { useParams, usePathname } from "next/navigation";
import OuterSidebar from "./OuterSidebar";
import InnerSidebar from "./InnerSidebar";
import { useSidebar } from "@/hooks/useSidebar";
import { api } from "@/trpc/react";
import { ClipLoader } from "react-spinners";
import { StudyStatus } from "@shared/generated/client";

export default function SidebarContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { shouldShowInnerSidebar } = useSidebar(pathname);
  const params = useParams();

  const { data: study, isFetching: isFetchingStudy } =
    api.studies.getStudy.useQuery(
      { studyId: params.studyId as string },
      {
        enabled: !!params.studyId,
        refetchOnWindowFocus: false,
      },
    );

  return (
    <div className="flex h-screen overflow-hidden">
      <OuterSidebar />
      {isFetchingStudy ? (
        <div className="flex h-full w-full items-center justify-center bg-theme-off-white">
          <ClipLoader size={48} color={"grey"} />
        </div>
      ) : (
        <div className="flex flex-grow flex-col overflow-hidden">
          {shouldShowInnerSidebar && study && (
            <InnerSidebar.TopContent study={study} />
          )}
          <div className="flex flex-grow overflow-hidden">
            {shouldShowInnerSidebar && (
              <InnerSidebar.SideContent
                isDraft={study?.status === StudyStatus.DRAFT}
              />
            )}
            <div className="flex flex-grow overflow-hidden">
              <main
                className={`w-full ${
                  shouldShowInnerSidebar
                    ? "rounded-md border border-theme-200"
                    : ""
                } overflow-auto scrollbar-thin`}
              >
                {children}
              </main>
              {shouldShowInnerSidebar && (
                <div className="h-full w-3 flex-shrink-0 bg-theme-50" />
              )}
            </div>
          </div>
          {shouldShowInnerSidebar && (
            <div className="h-3 w-full flex-shrink-0 bg-theme-50" />
          )}
        </div>
      )}
    </div>
  );
}
