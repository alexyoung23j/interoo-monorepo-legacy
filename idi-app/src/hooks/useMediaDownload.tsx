import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { downloadMedia } from "@/server/interoo-backend";
import { useToast } from "@/hooks/use-toast";
import { ClipLoader } from "react-spinners";

interface UseMediaDownloadProps {
  orgId: string | undefined;
  studyId: string | undefined;
}

interface DownloadingFile {
  responseId: string;
  toastId: string;
}

export const useMediaDownload = ({ orgId, studyId }: UseMediaDownloadProps) => {
  const [downloadingFiles, setDownloadingFiles] = useState<DownloadingFile[]>(
    [],
  );
  const { toast } = useToast();

  const processDownload = async ({
    currentResponseMediaUrl,
    isAudio,
    currentResponseContentType,
    currentResponseId,
    fileName,
    showToasts = true,
  }: {
    currentResponseMediaUrl: string;
    isAudio: boolean;
    currentResponseContentType: string;
    currentResponseId: string;
    fileName: string;
    showToasts?: boolean;
  }) => {
    let toastId: string | undefined;
    let dismissToast: (() => void) | undefined;
    let updateToast:
      | ((props: { id: string; description: React.ReactNode }) => void)
      | undefined;

    if (showToasts) {
      const toastResult = toast({
        title: "Download Progress",
        description: (
          <div className="flex flex-row items-center space-x-2">
            <ClipLoader size={16} color="#587785" />
            <span className="text-theme-900">Preparing download...</span>
          </div>
        ),
        duration: 1000000,
      });

      toastId = toastResult.id;
      dismissToast = toastResult.dismiss;
      updateToast = toastResult.update;
    }

    if (currentResponseContentType.includes("webm")) {
      // Convert webm files using the endpoint
      console.log("Converting webm file");

      if (toastId) {
        setDownloadingFiles((prev) => [
          ...prev,
          { responseId: currentResponseId, toastId },
        ]);
      }

      await convertAndDownload({
        isAudio,
        currentResponseContentType,
        currentResponseId,
        fileName,
        update:
          updateToast ??
          (() => {
            // do nothing
          }),
        toastId: toastId ?? "",
      });

      dismissToast?.();
    } else {
      // Direct download for other file types
      await directDownload({
        currentResponseMediaUrl,
        currentResponseContentType,
        fileName,
      });
    }

    if (showToasts) {
      toast({
        title: "Download Complete",
        description: "Your file has been downloaded successfully.",
        duration: 3000,
      });
    }
  };

  const handleDownload = async ({
    currentResponseMediaUrl,
    isAudio,
    currentResponseContentType,
    currentResponseId,
    fileName,
    questionId,
    showToasts = true,
  }: {
    currentResponseMediaUrl: string | undefined;
    isAudio: boolean;
    currentResponseContentType: string | undefined;
    currentResponseId: string | null;
    fileName: string;
    questionId: string | null;
    showToasts?: boolean;
  }) => {
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

    if (
      downloadingFiles.some((file) => file.responseId === currentResponseId)
    ) {
      console.log("This file is already being downloaded");
      return;
    }

    try {
      await processDownload({
        currentResponseMediaUrl,
        isAudio,
        currentResponseContentType,
        currentResponseId,
        fileName,
        showToasts,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "An error occurred while downloading the file.",
        duration: 3000,
        variant: "destructive",
      });
    } finally {
      setDownloadingFiles((prev) =>
        prev.filter((file) => file.responseId !== currentResponseId),
      );
    }
  };

  const convertAndDownload = async ({
    isAudio,
    currentResponseContentType,
    currentResponseId,
    fileName,
    update,
    toastId,
  }: {
    isAudio: boolean;
    currentResponseContentType: string;
    currentResponseId: string;
    fileName: string;
    update: (props: { id: string; description: React.ReactNode }) => void;
    toastId: string;
  }) => {
    update({
      id: toastId,
      description: (
        <div className="flex flex-row items-center space-x-2">
          <ClipLoader size={16} color="#587785" />
          <span className="text-theme-900">
            Converting and downloading file. Please don&apos;t leave this page
            😁
          </span>
        </div>
      ),
    });

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

    update({
      id: toastId,
      description: (
        <div className="flex flex-row items-center space-x-2">
          <ClipLoader size={16} color="#587785" />
          <span className="text-theme-900">Downloading...</span>
        </div>
      ),
    });

    const blob = new Blob([blobData], { type: currentResponseContentType });
    const url = window.URL.createObjectURL(blob);
    const fileNameWithExtension = `${fileName}.${targetFormat}`;

    downloadFile(url, fileNameWithExtension);
    window.URL.revokeObjectURL(url);
  };

  const directDownload = async ({
    currentResponseMediaUrl,
    currentResponseContentType,
    fileName,
  }: {
    currentResponseMediaUrl: string;
    currentResponseContentType: string;
    fileName: string;
  }) => {
    const response = await fetch(currentResponseMediaUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const fileExtension = currentResponseContentType.split("/")[1];
    const fileNameWithExtension = `${fileName}.${fileExtension}`;

    downloadFile(url, fileNameWithExtension);
    window.URL.revokeObjectURL(url);
  };

  const downloadFile = (url: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return { handleDownload, isDownloading: downloadingFiles.length > 0 };
};
