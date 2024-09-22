import SettingsPageComponent from "@/app/_components/org/settings/SettingsPageComponent";
import { api } from "@/trpc/server";
import React from "react";

export default async function SettingsPage({
  params,
}: {
  params: { orgId: string };
}) {
  const org = await api.orgs.getOrgDetails({ orgId: params.orgId });
  const billingInfo = await api.orgs.getBillingInfo({ orgId: params.orgId });
  return <SettingsPageComponent org={org} billingInfo={billingInfo} />;
}
