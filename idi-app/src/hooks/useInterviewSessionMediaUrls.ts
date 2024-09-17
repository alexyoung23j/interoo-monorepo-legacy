import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { fetchResponses } from "@/server/interoo-backend";
import { Response } from "@shared/generated/client";

interface UseInterviewSessionMediaUrlsProps {
  studyId: string;
  orgId: string;
}

interface MediaUrlData {
  signedUrl: string;
  contentType: "video" | "audio";
}

// New type for the fetchResponses result
interface FetchResponsesResult {
  signedUrls: Record<string, MediaUrlData>;
  responses: Response[];
}

export const useInterviewSessionMediaUrls = ({
  studyId,
  orgId,
}: UseInterviewSessionMediaUrlsProps) => {
  const [mediaUrls, setMediaUrls] = useState<Record<string, MediaUrlData>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});

  const fetchMediaUrl = useCallback(
    async (responseId: string, questionId: string) => {
      if (mediaUrls[responseId] || loadingUrls[responseId]) {
        return;
      }

      setLoadingUrls((prev) => ({ ...prev, [responseId]: true }));

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("No active session");

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const result: FetchResponsesResult = await fetchResponses({
          responseIds: [responseId],
          token: session.access_token,
          studyId,
          questionId,
          orgId,
        });

        const mediaUrlData = result.signedUrls[responseId];
        if (mediaUrlData) {
          setMediaUrls((prev) => ({
            ...prev,
            [responseId]: mediaUrlData,
          }));
        }
      } catch (error) {
        console.error("Error fetching media URL:", error);
      } finally {
        setLoadingUrls((prev) => ({ ...prev, [responseId]: false }));
      }
    },
    [studyId, orgId],
  );

  return {
    mediaUrls,
    loadingUrls,
    fetchMediaUrl,
  };
};
