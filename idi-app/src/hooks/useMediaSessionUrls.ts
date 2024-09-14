import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { fetchResponses } from "@/server/interoo-backend";
import { Response } from "@shared/generated/client";
import { ExtendedStudy } from "@/app/_components/org/study/distribution/results/ResultsPageComponent";

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

export const useMediaSessionUrls = ({
  responses,
  study,
  questionId,
}: UseMediaSessionUrlsProps): UseQueryResult<MediaUrlData, Error> => {
  return useQuery<MediaUrlData, Error>({
    queryKey: ["responses", responses?.map((r) => r.id)],
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
        studyId: study.id,
        questionId: questionId,
        orgId: study.organizationId,
      });
      return result as MediaUrlData;
    },
    enabled: !!responses?.length,
  });
};
