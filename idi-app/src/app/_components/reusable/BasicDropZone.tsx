import React, { useCallback, useState } from "react";
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import axios from "axios";
import ClipLoader from "react-spinners/ClipLoader";
import { showErrorToast } from "@/app/utils/toastUtils";
import {
  getSignedUploadUrl,
  uploadFileToSignedUrl,
} from "@/server/interoo-backend";
import { createClient } from "@/utils/supabase/client";
import { UploadSimple } from "@phosphor-icons/react";

interface BasicDropZoneProps {
  uploadMessage: string;
  allowedFileTypes: string[];
  filePath: string;
  onCompleted: (url: string) => void;
}

interface SignedUrlResponse {
  uploadUrl: string;
}

const BasicDropZone: React.FC<BasicDropZoneProps> = ({
  uploadMessage,
  allowedFileTypes,
  filePath,
  onCompleted,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback(
    (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: DropEvent,
    ) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setIsLoading(true);

      const uploadFile = async () => {
        try {
          if (!file) {
            console.error("No file selected");
            return;
          }

          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) throw new Error("No active session");

          console.log("filePath", filePath, session.access_token);

          // Get signed URL
          const { uploadUrl } = (await getSignedUploadUrl({
            filePath: `${filePath}/${file.name}`,
            contentType: file.type,
            token: session.access_token,
          })) as SignedUrlResponse;

          console.log("uploadUrl", uploadUrl);

          // Upload file
          await uploadFileToSignedUrl({
            signedUrl: uploadUrl,
            file,
            contentType: file.type,
          });

          console.log("uploaded file");

          // Call onCompleted callback with the file path
          onCompleted(`${filePath}/${file.name}`);
        } catch (error) {
          console.error(
            "Error uploading file:",
            error instanceof Error ? error.message : String(error),
          );
          showErrorToast("Error uploading file");
        } finally {
          setIsLoading(false);
        }
      };

      uploadFile().catch((error) => {
        showErrorToast("Error uploading file");
        setIsLoading(false);
      });
    },
    [filePath, onCompleted],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedFileTypes.reduce<Record<string, string[]>>((acc, type) => {
      acc[type] = [];
      return acc;
    }, {}),
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-theme-300 bg-theme-50 bg-theme-off-white shadow-sm hover:bg-theme-100"
    >
      <input {...getInputProps()} />
      {isLoading ? (
        <ClipLoader color="#587785" loading={isLoading} size={50} />
      ) : isDragActive ? (
        <p className="text-theme-900">Drop the file here ...</p>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <UploadSimple size={50} className="text-theme-400" />
          <p className="mb-2 text-sm text-theme-600">{uploadMessage}</p>
        </div>
      )}
    </div>
  );
};

export default BasicDropZone;
