import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { api } from "@/trpc/server";

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

  return <>{children}</>;
}
