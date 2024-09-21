import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { fetchResponses } from "@/server/interoo-backend";
import { Response } from "@shared/generated/client";
import { ExtendedStudy } from "@/app/_components/org/study/results/ResultsPageComponent";

interface UseMediaSessionUrlsProps {
  responses: Response[] | null;
  study: ExtendedStudy;
  questionId: string;
}

interface MediaUrlData {
  signedUrls: Record<
    string,
    {
      signedUrl: string;
      contentType: "video" | "audio";
    }
  >;
}

const STALE_TIME = 55 * 60 * 1000; // 55 minutes in milliseconds

export const useMediaSessionUrls = ({
  responses,
  study,
  questionId,
}: UseMediaSessionUrlsProps): UseQueryResult<MediaUrlData, Error> => {
  return useQuery<MediaUrlData, Error>({
    queryKey: ["mediaUrls", study.id, questionId, responses?.map((r) => r.id)],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await fetchResponses({
        responseIds: responses?.map((r) => r.id) ?? [],
        token: session.access_token,
      });
      return result as MediaUrlData;
    },
    enabled: !!responses?.length,
    staleTime: STALE_TIME, // Consider data fresh for 55 minutes
  });
};
