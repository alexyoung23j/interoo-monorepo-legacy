import { createClient } from "@/utils/supabase/client";
import { api } from "@/trpc/react";

export function useProfile() {
  const supabase = createClient();
  const session = supabase.auth.getSession();

  const { data: profile, ...rest } = api.orgs.getProfile.useQuery(undefined, {
    // Only fetch when there's an active session
    enabled: !!session,
    // Refetch on mount and window focus
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return { profile, ...rest };
}
