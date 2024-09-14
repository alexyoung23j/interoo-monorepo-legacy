import React from "react";
import { FollowUpQuestion, Question, Response } from "@shared/generated/client";
import { ClipLoader } from "react-spinners";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { formatDuration } from "@/app/utils/functions";
import BasicTag from "@/app/_components/reusable/BasicTag";
import { useQuery } from "@tanstack/react-query";
import { fetchResponses } from "@/server/interoo-backend";
import { createClient } from "@/utils/supabase/client";
import { ExtendedStudy } from "./ResultsPageComponent";

interface QuestionModalLeftContentProps {
  responses:
    | (Response & {
        question: Question | null;
        followUpQuestion: FollowUpQuestion | null;
      })[]
    | null;
  currentResponseId: string | null;
  study: ExtendedStudy;
  question: Question;
}

const QuestionModalLeftContent: React.FC<QuestionModalLeftContentProps> = ({
  responses,
  currentResponseId,
  study,
  question,
}) => {
  const {
    data: mediaUrlData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["responses", responses?.map((r) => r.id)],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
      return fetchResponses({
        responseIds: responses?.map((r) => r.id) ?? [],
        token: session.access_token,
        studyId: study.id,
        questionId: question.id,
        orgId: study.organizationId,
      });
    },
    enabled: !!responses?.length,
  });

  console.log({ mediaUrlData });

  if (!responses || !mediaUrlData) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ClipLoader color="grey" />
      </div>
    );
  }

  const currentResponseMediaUrl =
    mediaUrlData.signedUrls[currentResponseId ?? ""]?.signedUrl;
  const currentResponseContentType =
    mediaUrlData.signedUrls[currentResponseId ?? ""]?.contentType;

  console.log({ currentResponseMediaUrl, currentResponseContentType });
  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-4 text-lg font-semibold text-theme-900">
        Response Details
      </div>
      <div className="w-full flex-grow bg-theme-200">
        <video
          src={currentResponseMediaUrl}
          controls
          className="h-full w-full object-contain"
        />
      </div>

      {/* Add more content here as needed */}
    </div>
  );
};

export default QuestionModalLeftContent;
