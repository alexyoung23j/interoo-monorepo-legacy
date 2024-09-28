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
      const signedUrls: Record<string, string> = {};

      for (const filePath of filePaths) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { readUrl } = await getSignedReadUrl({
          filePath,
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
