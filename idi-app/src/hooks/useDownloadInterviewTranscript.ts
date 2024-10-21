import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import axios from "axios";

interface UseDownloadInterviewTranscriptProps {
  interviewId: string | undefined;
}

export const useDownloadInterviewTranscript = ({
  interviewId,
}: UseDownloadInterviewTranscriptProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (fileName: string) => {
    if (!interviewId) {
      console.error("Missing required interviewId for download");
      return;
    }

    setIsDownloading(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await axios({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/create-interview-transcript-export/${interviewId}`,
        method: "GET",
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);

      const fileNameWithExtension = `${fileName}.docx`;

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
