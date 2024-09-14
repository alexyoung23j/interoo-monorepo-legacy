import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { fetchResponses } from "@/server/interoo-backend";
import { Response } from "@shared/generated/client";
import { ExtendedStudy } from "@/app/_components/org/study/distribution/results/ResultsPageComponent";

interface UseMediaSessionUrlsProps {
  responses: Response[] | null;
  study: ExtendedStudy;
  questionId: string;
}

export const useMediaSessionUrls = ({
  responses,
  study,
  questionId,
}: UseMediaSessionUrlsProps) => {
  return useQuery({
    queryKey: ["responses", responses?.map((r) => r.id)],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
      return fetchResponses({
        responseIds: responses?.map((r) => r.id) ?? [],
        token: session.access_token,
        studyId: study.id,
        questionId: questionId,
        orgId: study.organizationId,
      });
    },
    enabled: !!responses?.length,
  });
};
