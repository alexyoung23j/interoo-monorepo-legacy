"use client";

import { FC } from "react";
import { useParams } from "next/navigation";
import LoginButton from "@/app/_components/auth/LoginButton";

const AcceptInvitePage: FC = () => {
  const params = useParams();
  const inviteToken = params.inviteToken as string;

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Accept Invite</h1>
      <p>Invite Token: {inviteToken}</p>
      <LoginButton provider="google" next={`/invite/${inviteToken}/callback`}>
        Login with Google
      </LoginButton>
    </div>
  );
};

export default AcceptInvitePage;
