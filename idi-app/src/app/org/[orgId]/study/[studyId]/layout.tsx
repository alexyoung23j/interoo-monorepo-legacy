import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";

/** Ensures the study e */
export default async function OrgStudyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgId: string; studyId: string };
}) {
  try {
    const study = await api.studies.checkStudyExists({
      studyId: params.studyId,
    });

    if (!study) {
      redirect("/404");
    }
  } catch (error) {
    redirect("/404");
  }

  return children;
}
