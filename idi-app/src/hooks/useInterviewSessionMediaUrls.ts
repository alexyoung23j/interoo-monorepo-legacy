import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { fetchResponses } from "@/server/interoo-backend";
import { Response } from "@shared/generated/client";

interface UseInterviewSessionMediaUrlsProps {
  responses: Response[] | null;
  studyId: string;
  orgId: string;
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

// Define the return type of fetchResponses
interface FetchResponsesResult {
  signedUrls: MediaUrlData["signedUrls"];
}

export const useInterviewSessionMediaUrls = ({
  responses,
  studyId,
  orgId,
}: UseInterviewSessionMediaUrlsProps): UseQueryResult<MediaUrlData, Error> => {
  return useQuery<MediaUrlData, Error>({
    queryKey: ["interviewSessionResponses", responses?.map((r) => r.id)],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const allSignedUrls: MediaUrlData["signedUrls"] = {};

      for (const response of responses ?? []) {
        const result = (await fetchResponses({
          responseIds: [response.id],
          token: session.access_token,
          studyId: studyId,
          questionId: response.questionId,
          orgId: orgId,
        })) as FetchResponsesResult; // Cast the result to the expected type

        Object.assign(allSignedUrls, result.signedUrls);
      }

      return { signedUrls: allSignedUrls };
    },
    enabled: !!responses?.length,
  });
};
