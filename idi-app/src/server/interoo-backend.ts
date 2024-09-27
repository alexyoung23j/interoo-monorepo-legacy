import axios from "axios";

export const fetchResponses = async ({
  responseIds,
  token,
}: {
  responseIds: string[];
  token: string;
}) => {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-signed-urls-for-media-view/batch`,
    { responseIds },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return res.data;
};

export const downloadMedia = async ({
  targetFormat,
  responseId,
  token,
}: {
  targetFormat: string;
  responseId: string;
  token: string;
}) => {
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/convert-and-download`,
    {
      targetFormat,
      responseId,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      responseType: "blob",
    },
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return response.data;
};

export const createStudyDataExport = async ({
  studyId,
  token,
}: {
  studyId: string;
  token: string;
}) => {
  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/create-study-data-export/${studyId}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return response.data;
};

// Used by Dropzone
export const getSignedUploadUrl = async ({
  filePath,
  contentType,
  token,
}: {
  filePath: string;
  contentType: string;
  token: string;
}) => {
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-signed-upload-url`,
    {
      filePath,
      contentType,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return response.data;
};

export const uploadFileToSignedUrl = async ({
  signedUrl,
  file,
  contentType,
}: {
  signedUrl: string;
  file: File;
  contentType: string;
}) => {
  await axios.put(signedUrl, file, {
    headers: { "Content-Type": contentType },
  });
};
