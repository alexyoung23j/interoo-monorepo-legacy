import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { getSignedReadUrl } from "@/server/interoo-backend";

interface UseSignedReadUrlsProps {
  filePaths: string[];
}

interface SignedReadUrlData {
  signedUrls: Record<string, string>;
}

const STALE_TIME = 23 * 60 * 60 * 1000; // 23 hours in milliseconds

export const useSignedReadUrls = ({
  filePaths,
}: UseSignedReadUrlsProps): UseQueryResult<SignedReadUrlData, Error> => {
  return useQuery<SignedReadUrlData, Error>({
    queryKey: ["signedReadUrls", filePaths],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const signedUrls: Record<string, string> = {};

      for (const filePath of filePaths) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { readUrl } = await getSignedReadUrl({
          filePath,
          token: session.access_token,
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        signedUrls[filePath] = readUrl;
      }

      return { signedUrls };
    },
    enabled: filePaths.length > 0,
    staleTime: STALE_TIME, // Consider data fresh for 23 hours
  });
};
