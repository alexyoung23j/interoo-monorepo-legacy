import AcceptInvitePageComponent from "@/app/_components/auth/AcceptInvitePageComponent";
import { api } from "@/trpc/server";

export default async function AcceptInvitePage({
  params,
}: {
  params: { inviteToken: string };
}) {
  const inviteDetails = await api.orgs.getInviteDetailsFromToken({
    inviteToken: params.inviteToken,
  });

  return (
    <AcceptInvitePageComponent
      inviteDetails={inviteDetails}
      inviteToken={params.inviteToken}
    />
  );
}
