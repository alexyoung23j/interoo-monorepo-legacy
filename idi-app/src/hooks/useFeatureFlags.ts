import { useQuery } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { useCallback } from "react";

export function useFeatureFlags(organizationId: string) {
  const {
    data: featureFlags,
    isLoading,
    error,
  } = api.featureFlags.getFeatureFlags.useQuery(
    { organizationId },
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );

  const isFeatureEnabled = useCallback(
    (flagName: string) => {
      return featureFlags?.[flagName] ?? false;
    },
    [featureFlags],
  );
  return {
    featureFlags,
    isLoading,
    error,
    isFeatureEnabled,
  };
}
