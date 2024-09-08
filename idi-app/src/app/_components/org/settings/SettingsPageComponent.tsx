"use client";

import TitleLayout from "@/app/_components/layouts/org/TitleLayout";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { Link } from "@phosphor-icons/react";
import { Organization, Profile } from "@shared/generated/client";
import React, { useState } from "react";
import { BasicLinkCopy } from "../../reusable/BasicLinkCopy";
import { showErrorToast } from "@/app/utils/toastUtils";
import { TRPCClientError } from "@trpc/client";

export default function SettingsPageComponent({
  org,
}: {
  org: (Organization & { users: Profile[] }) | null;
}) {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const createInvite = api.orgs.createInvite.useMutation();

  const handleGenerateInviteLink = async () => {
    setIsGeneratingLink(true);
    try {
      const link = await createInvite.mutateAsync({
        organizationId: org?.id as string,
      });
      setInviteLink(`${window.location.origin}/invite/${link.token}`);
      setIsGeneratingLink(false);
    } catch (error) {
      console.log(error);
      setIsGeneratingLink(false);
      if (error instanceof TRPCClientError) {
        showErrorToast(error.message);
      }
    }
  };

  return (
    <TitleLayout title="Settings" className="flex flex-col gap-20">
      <div className="text-theme-900 flex flex-col gap-2">
        <div className="text-base font-semibold">Team</div>
        <div className="text-theme-600 mb-4 text-sm">
          Send an invite link to a team member to join your org.
        </div>
        {inviteLink ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-2">
              <BasicLinkCopy
                link={inviteLink}
                toastString="Invite link copied."
              />
              <div className="text-theme-600 text-xs">Shareable link</div>
            </div>
            <div className="text-theme-600 mt-4 max-w-[50%] text-sm font-light">
              *Note that this link will only allow a single member to join. To
              create additional invites, refresh this page and regenerate. Email
              invites are coming soon!
            </div>
          </div>
        ) : (
          <Button
            className="text-theme-off-white gap-2"
            onClick={handleGenerateInviteLink}
          >
            <Link size={16} className="text-theme-off-white" />
            {isGeneratingLink ? "Generating..." : "Generate invite link"}
          </Button>
        )}
      </div>
      <div className="text-theme-900 flex flex-col gap-2">
        <div className="text-base font-semibold">Panel Credits</div>
        <div className="text-theme-600 mb-4 text-sm">Coming soon.</div>
      </div>
      <div className="text-theme-900 flex flex-col gap-2">
        <div className="text-base font-semibold">Billing</div>
        <div className="text-theme-600 mb-4 text-sm">Coming soon.</div>
      </div>
    </TitleLayout>
  );
}
