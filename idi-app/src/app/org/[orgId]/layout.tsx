import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { api } from "@/trpc/server";
import SidebarContainer from "@/app/_components/layouts/sidebar/SidebarContainer";
import { Study } from "@shared/generated/client";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgId: string };
}) {
  try {
    const { isOrgMember } = await api.orgs.getUserOrgMembership({
      orgId: params.orgId,
    });

    if (!isOrgMember) {
      redirect("/404");
    }
  } catch (error) {
    redirect("/404");
  }

  return (
    <div className="w-full bg-theme-50 sm:h-screen">
      <div className="hidden sm:block">
        <SidebarContainer>{children}</SidebarContainer>
      </div>
      <div className="block h-screen sm:hidden">
        <div className="flex h-screen w-full items-center justify-center bg-theme-50 p-10 text-center text-theme-900">
          Please visit Interoo on a desktop to access this page.
        </div>
      </div>
    </div>
  );
}
