import { redirect } from "next/navigation";
import { api } from "@/trpc/server";

/**
 * This layout is used to redirect the user to their org if they are already logged in.
 * @param param0
 * @returns
 */
export default async function AuthPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userOrg = await api.orgs.getUserOrg();

  if (userOrg) {
    console.log(`Redirecting to /org/${userOrg}/studies`);
    redirect(`/org/${userOrg}/studies`);
  }

  return <>{children}</>;
}
