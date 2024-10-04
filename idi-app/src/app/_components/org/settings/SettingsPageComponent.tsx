"use client";

import TitleLayout from "@/app/_components/layouts/org/TitleLayout";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { Link } from "@phosphor-icons/react";
import {
  Organization,
  Profile,
  ProfileInOrganization,
} from "@shared/generated/client";
import React, { useState } from "react";
import { BasicLinkCopy } from "../../reusable/BasicLinkCopy";
import { showErrorToast } from "@/app/utils/toastUtils";
import { TRPCClientError } from "@trpc/client";
import BasicTitleSection from "../../reusable/BasicTitleSection";
import BasicCard from "../../reusable/BasicCard";
import CardTable from "../../reusable/CardTable";
import { useRouter } from "next/navigation";

interface BillingInfo {
  studyBillingInfo: { studyId: string; studyName: string; minutes: number }[];
  totalMinutes: number;
}

export default function SettingsPageComponent({
  org,
  billingInfo,
}: {
  org: (Organization & { profiles: ProfileInOrganization[] }) | null;
  billingInfo: BillingInfo;
}) {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const createInvite = api.orgs.createInvite.useMutation();

  const handleGenerateInviteLink = async () => {
    setIsGeneratingLink(true);
    try {
      const link = await createInvite.mutateAsync({
        organizationId: org!.id,
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

  const pricePerMinute = 0.3;
  const currentBill = billingInfo.totalMinutes * pricePerMinute;

  const columns = [
    { key: "studyName", header: "Study Name", width: "70%" },
    {
      key: "minutes",
      header: "Minutes",
      width: "30%",
      className: "justify-end",
    },
  ];

  const router = useRouter();

  return (
    <TitleLayout title="Settings" className="flex flex-col gap-20 pb-20">
      <BasicTitleSection
        title="Team"
        subtitle="Send an invite link to a team member to join your org."
      >
        {inviteLink ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-2">
              <div className="w-fit">
                <BasicLinkCopy
                  link={inviteLink}
                  toastString="Invite link copied."
                />
              </div>
              <div className="text-xs text-theme-600">Shareable link</div>
            </div>
            <div className="mt-4 max-w-[50%] text-sm font-light text-theme-600">
              *This link will only allow a single member to join. To create
              additional invites, refresh this page and regenerate. Email
              invites are coming soon!
            </div>
          </div>
        ) : (
          <Button
            className="gap-2 text-theme-off-white"
            onClick={handleGenerateInviteLink}
          >
            <Link size={16} className="text-theme-off-white" />
            {isGeneratingLink ? "Generating..." : "Generate invite link"}
          </Button>
        )}
      </BasicTitleSection>
      <BasicTitleSection title="Members">
        <div className="text-theme-600">Coming soon!</div>
      </BasicTitleSection>

      <BasicTitleSection title="Billing">
        <div className="text-theme-600">Coming soon!</div>
        {/* <BasicCard className="mt-2 flex flex-col gap-4">
          <div className="flex justify-between">
            <span className="text-lg font-semibold text-theme-900">
              Current Bill:
            </span>
            <span className="text-lg font-semibold text-theme-900">
              ${currentBill.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-theme-600">
              Price per response minute:
            </span>
            <span className="text-sm text-theme-600">
              ${pricePerMinute.toFixed(2)}
            </span>
          </div>
          <div className="mt-4">
            <CardTable
              data={billingInfo.studyBillingInfo}
              columns={columns}
              tableClassName="mt-4"
              onRowClick={(row) => {
                router.push(`/org/${org?.id}/study/${row.studyId}/interviews`);
              }}
            />
          </div>
        </BasicCard> */}
      </BasicTitleSection>
    </TitleLayout>
  );
}
