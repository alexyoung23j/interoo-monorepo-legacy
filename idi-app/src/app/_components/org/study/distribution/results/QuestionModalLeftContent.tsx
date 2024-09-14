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
import BasicMediaViewer from "@/app/_components/reusable/BasicMediaViewer";
import { useMediaSessionUrls } from "@/hooks/useMediaSessionUrls";
import { Button } from "@/components/ui/button";
import { Download } from "@phosphor-icons/react";

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
  } = useMediaSessionUrls({ responses, study, questionId: question.id });

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

  const currentResponse = responses.find(
    (response) => response.id === currentResponseId,
  );

  return (
    <div className="flex h-full w-full flex-col justify-start gap-4 pb-20">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="text-lg font-semibold text-theme-900">
          Response Details
        </div>
        <Button variant="secondary" className="gap-2" size="sm">
          <Download size={16} className="text-theme-900" />
          {`Download ${currentResponseContentType == "audio/webm" ? "audio" : "video"}`}
        </Button>
      </div>
      <div className="h-[1px] w-full bg-theme-200 text-theme-900"></div>

      <div className="w-full flex-grow">
        <BasicMediaViewer
          mediaUrl={currentResponseMediaUrl ?? ""}
          mediaType={"audio/webm"}
        />
      </div>

      <div className="px-20 text-sm text-theme-600">{`"${currentResponse?.fastTranscribedText}"`}</div>
    </div>
  );
};

export default QuestionModalLeftContent;
