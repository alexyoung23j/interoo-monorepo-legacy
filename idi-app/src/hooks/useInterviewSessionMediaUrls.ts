import { useState, useCallback, useRef } from "react";
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
  expiresAt: number;
}

interface FetchResponsesResult {
  signedUrls: Record<string, MediaUrlData>;
  responses: Response[];
}

const CACHE_DURATION = 55 * 60 * 1000; // 55 minutes in milliseconds

export const useInterviewSessionMediaUrls = ({
  studyId,
  orgId,
}: UseInterviewSessionMediaUrlsProps) => {
  const [mediaUrls, setMediaUrls] = useState<Record<string, MediaUrlData>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  const cachedUrls = useRef<Record<string, MediaUrlData>>({});

  const fetchMediaUrl = useCallback(
    async (responseId: string, questionId: string) => {
      const now = Date.now();
      const cachedUrl = cachedUrls.current[responseId];

      if (cachedUrl && cachedUrl.expiresAt > now) {
        setMediaUrls((prev) => ({ ...prev, [responseId]: cachedUrl }));
        return;
      }

      if (loadingUrls[responseId]) {
        return;
      }

      setLoadingUrls((prev) => ({ ...prev, [responseId]: true }));

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("No active session");

        const result = (await fetchResponses({
          responseIds: [responseId],
          token: session.access_token,
        })) as FetchResponsesResult;

        const mediaUrlData = result.signedUrls[responseId];
        if (mediaUrlData) {
          const urlWithExpiration: MediaUrlData = {
            ...mediaUrlData,
            expiresAt: now + CACHE_DURATION,
          };
          cachedUrls.current[responseId] = urlWithExpiration;
          setMediaUrls((prev) => ({
            ...prev,
            [responseId]: urlWithExpiration,
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
