import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import axios from "axios";

interface UseExportDataProps {
  studyId: string | undefined;
}

export const useExportData = ({ studyId }: UseExportDataProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (fileName: string) => {
    if (!studyId) {
      console.error("Missing required parameters for export");
      return;
    }

    setIsExporting(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await axios({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/create-study-data-export/${studyId}`,
        method: "GET",
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);

      const fileNameWithExtension = `${fileName}.xlsx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameWithExtension;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      // You might want to add some user-facing error handling here
    } finally {
      setIsExporting(false);
    }
  };

  return { handleExport, isExporting };
};
