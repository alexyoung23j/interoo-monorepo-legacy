import axios from "axios";

export const fetchResponses = async ({
  responseIds,
  studyId,
  questionId,
  orgId,
  token,
}: {
  responseIds: string[];
  studyId: string;
  questionId: string;
  orgId: string;
  token: string;
}) => {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-signed-urls-for-media-view/batch`,
    { responseIds, studyId, questionId, orgId },
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
  url,
  targetFormat,
  responseId,
  orgId,
  studyId,
  questionId,
  token,
}: {
  url: string;
  targetFormat: string;
  responseId: string;
  orgId: string;
  studyId: string;
  questionId: string;
  token: string;
}) => {
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/convert-and-download`,
    {
      url,
      targetFormat,
      responseId,
      orgId,
      studyId,
      questionId,
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
