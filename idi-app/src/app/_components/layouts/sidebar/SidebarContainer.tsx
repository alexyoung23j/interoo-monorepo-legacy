"use client";

import { usePathname } from "next/navigation";
import OuterSidebar from "./OuterSidebar";
import InnerSidebar from "./InnerSidebar";
import { useSidebar } from "@/hooks/useSidebar";

export default function SidebarContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { shouldShowInnerSidebar } = useSidebar(pathname);

  return (
    <div className="flex h-screen overflow-hidden">
      <OuterSidebar />
      <div className="flex flex-grow flex-col overflow-hidden">
        {shouldShowInnerSidebar && <InnerSidebar.TopContent />}
        <div className="flex flex-grow overflow-hidden">
          {shouldShowInnerSidebar && <InnerSidebar.SideContent />}
          <div className="flex flex-grow overflow-hidden">
            <main
              className={`w-full ${
                shouldShowInnerSidebar
                  ? "border-theme-200 rounded-md border"
                  : ""
              } overflow-auto`}
            >
              {children}
            </main>
            {shouldShowInnerSidebar && (
              <div className="bg-theme-50 h-full w-3 flex-shrink-0" />
            )}
          </div>
        </div>
        {shouldShowInnerSidebar && (
          <div className="bg-theme-50 h-3 w-full flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
