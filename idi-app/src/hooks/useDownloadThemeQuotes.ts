import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import axios from "axios";

interface UseDownloadThemeQuotesProps {
  themeId: string;
  themeName: string;
}

export const useDownloadThemeQuotes = ({
  themeId,
  themeName,
}: UseDownloadThemeQuotesProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!themeId) {
      console.error("Missing required themeId for download");
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
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/create-theme-quotes-export/${themeId}`,
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

      const fileName = `Theme_Quotes_${themeName.toLowerCase().replace(/\s+/g, "_")}.docx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return { handleDownload, isDownloading };
};
