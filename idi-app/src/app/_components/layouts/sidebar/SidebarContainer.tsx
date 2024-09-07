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
    <div className="flex h-screen">
      <OuterSidebar />
      <div className="flex flex-grow flex-col">
        {shouldShowInnerSidebar && <InnerSidebar.TopContent />}
        <div className="flex flex-grow">
          {shouldShowInnerSidebar && <InnerSidebar.SideContent />}
          <main className="flex-grow p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
