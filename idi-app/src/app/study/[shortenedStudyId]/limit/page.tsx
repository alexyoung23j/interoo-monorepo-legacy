import { api } from "@/trpc/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isColorLight } from "@/app/utils/color";
import LimitPageContent from "./LimitPageContent";

export default async function LimitReachPage({
  params,
}: {
  params: { shortenedStudyId: string };
}) {
  const { shortenedStudyId } = params;

  const { study, organization } = await api.studies.getStudyDetails({
    shortenedStudyId: shortenedStudyId,
  });

  // Get the host from headers
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  if (!organization) {
    return redirect(`${origin}/404`);
  }

  const isLight = isColorLight(organization?.primaryColor ?? "");

  return <LimitPageContent organization={organization} isLight={isLight} />;
}
