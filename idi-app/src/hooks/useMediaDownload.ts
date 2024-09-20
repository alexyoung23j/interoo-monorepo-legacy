import { useState } from "react";
import axios from "axios";
import { createClient } from "@/utils/supabase/client";
import { ExtendedStudy } from "@/app/_components/org/study/results/ResultsPageComponent";
import { downloadMedia } from "@/server/interoo-backend";

interface UseMediaDownloadProps {
  orgId: string | undefined;
  studyId: string | undefined;
  questionId: string | undefined;
}

export const useMediaDownload = ({
  orgId,
  studyId,
  questionId,
}: UseMediaDownloadProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (
    currentResponseMediaUrl: string | undefined,
    currentResponseContentType: string | undefined,
    currentResponseId: string | null,
    fileName: string,
  ) => {
    if (
      !currentResponseMediaUrl ||
      !currentResponseContentType ||
      !currentResponseId ||
      !orgId ||
      !studyId ||
      !questionId
    ) {
      console.error("Missing required parameters for download");
      return;
    }

    setIsDownloading(true);
    try {
      const isAudio = currentResponseContentType === "audio";
      const targetFormat = isAudio ? "mp3" : "mp4";

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const blobData = await downloadMedia({
        targetFormat,
        responseId: currentResponseId,
        token: session.access_token,
      });

      const blob = new Blob([blobData], { type: currentResponseContentType });
      const url = window.URL.createObjectURL(blob);

      const fileNameWithExtension = `${fileName}.${targetFormat}`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameWithExtension;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // You might want to add some user-facing error handling here
    } finally {
      setIsDownloading(false);
    }
  };

  return { handleDownload, isDownloading };
};
