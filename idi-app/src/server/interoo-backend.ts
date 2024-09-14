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
  const { data } = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-signed-urls-for-media-view/batch`,
    { responseIds, studyId, questionId, orgId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return data;
};
