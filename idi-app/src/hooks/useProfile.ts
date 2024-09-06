import { createClient } from "@/utils/supabase/client";
import { api } from "@/trpc/react";
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";

export function useProfile() {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch((error) => {
        console.error("Error fetching session:", error);
      });
  }, []);

  const { data: profile, ...rest } = api.orgs.getProfile.useQuery(undefined, {
    // Only fetch when there's an active session
    enabled: !!session,
    // Refetch on mount and window focus
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return { profile, ...rest };
}
