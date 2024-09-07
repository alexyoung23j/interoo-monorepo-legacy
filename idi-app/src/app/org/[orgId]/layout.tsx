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
    <div className="bg-theme-50 h-screen w-full">
      <SidebarContainer>{children}</SidebarContainer>
    </div>
  );
}
