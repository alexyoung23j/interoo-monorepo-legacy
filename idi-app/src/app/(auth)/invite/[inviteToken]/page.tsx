"use client";

import { FC } from "react";
import { useParams } from "next/navigation";
import LoginButton from "@/app/_components/auth/LoginButton";
import SimpleLayout from "@/app/_components/layouts/SimpleLayout";
import { GoogleLogo } from "@/app/_components/svg/GoogleLogo";
import { api } from "@/trpc/react";

const AcceptInvitePage: FC = () => {
  const params = useParams();
  const inviteToken = params.inviteToken as string;

  const { data: inviteDetails } = api.orgs.getInviteDetailsFromToken.useQuery({
    inviteToken,
  });

  return (
    <SimpleLayout showLogo={true}>
      <div className="flex flex-col items-center justify-center gap-2">
        <h1 className="text-theme-600 mb-4 text-center text-xl leading-10">
          {`You've been invited to join`}
          <br />
          <span className="text-2xl font-bold">{inviteDetails?.orgName}</span>
        </h1>
        <div className="bg-theme-off-white border-theme-400 shadow-standard flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-sm border p-4 md:w-[600px] md:p-6">
          <h2 className="text-theme-900 text-lg font-medium md:text-xl">
            Sign Up
          </h2>
          <div className="bg-theme-100 flex h-[1px] w-full flex-col items-center justify-center gap-4" />
          <LoginButton
            next={`/invite/${inviteToken}/callback`}
            provider="google"
            className="border-theme-200 bg-theme-50 text-theme-700 hover:bg-theme-100 text-medium flex w-full items-center justify-center gap-4 rounded-md border px-4 py-2 transition-colors"
          >
            <GoogleLogo className="size-5" />
            <span>Sign up with Gmail</span>
          </LoginButton>
        </div>
      </div>
    </SimpleLayout>
  );
};

export default AcceptInvitePage;
