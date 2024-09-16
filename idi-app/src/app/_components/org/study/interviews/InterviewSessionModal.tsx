import React, { useEffect, useState, useMemo } from "react";
import SplitScreenModal from "@/app/_components/layouts/org/SplitScreenModal";
import {
  InterviewSession,
  Response,
  Question,
  FollowUpQuestion,
} from "@shared/generated/client";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import { api } from "@/trpc/react";
import { formatDuration } from "@/app/utils/functions";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { ClipLoader } from "react-spinners";
import BasicTag from "@/app/_components/reusable/BasicTag";
import BasicMediaViewer from "@/app/_components/reusable/BasicMediaViewer";
import { useInterviewSessionMediaUrls } from "@/hooks/useInterviewSessionMediaUrls";
import { Button } from "@/components/ui/button";
import { Download } from "@phosphor-icons/react";
import { useMediaDownload } from "@/hooks/useMediaDownload";

interface InterviewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewSession: InterviewSession;
  studyId: string;
  orgId: string;
}

type ExtendedResponse = Response & {
  question: Question;
  followUpQuestion: FollowUpQuestion | null;
};

const InterviewSessionModal: React.FC<InterviewSessionModalProps> = ({
  isOpen,
  onClose,
  interviewSession,
  studyId,
  orgId,
}) => {
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(
    null,
  );

  const { data: responsesData, isLoading: isLoadingResponses } =
    api.interviews.getInterviewSessionResponses.useQuery(
      { interviewSessionId: interviewSession.id },
      { enabled: isOpen },
    );

  const filteredResponses = useMemo(
    () =>
      responsesData?.filter(
        (response) => response.fastTranscribedText !== "",
      ) ?? [],
    [responsesData],
  );

  const { data: mediaUrlData, isLoading: isLoadingMediaUrls } =
    useInterviewSessionMediaUrls({
      responses: filteredResponses,
      studyId,
      orgId,
    });

  const { handleDownload, isDownloading: isDownloadingMedia } =
    useMediaDownload({
      orgId: orgId,
      studyId: studyId,
      questionId: selectedResponseId ?? "",
    });

  useEffect(() => {
    if (!isOpen) {
      setSelectedResponseId(null);
    } else if (filteredResponses.length > 0 && !selectedResponseId) {
      const firstResponse = filteredResponses[0];
      if (firstResponse && firstResponse.id) {
        setSelectedResponseId(firstResponse.id);
      }
    }
  }, [isOpen, filteredResponses, selectedResponseId]);

  const totalTime =
    interviewSession.startTime && interviewSession.lastUpdatedTime
      ? formatDuration(
          new Date(interviewSession.startTime),
          new Date(interviewSession.lastUpdatedTime),
        )
      : "0:00";

  const currentResponseMediaUrl =
    mediaUrlData?.signedUrls[selectedResponseId ?? ""]?.signedUrl;
  const currentResponseContentType =
    mediaUrlData?.signedUrls[selectedResponseId ?? ""]?.contentType;

  if (!studyId || !orgId) {
    return null; // or a loading indicator
  }

  return (
    <SplitScreenModal
      isOpen={isOpen}
      onClose={onClose}
      topContent={
        <BasicHeaderCard
          items={[
            {
              title: interviewSession.id,
              subtitle: "Interview Id",
            },
            {
              title: interviewSession.startTime?.toDateString() ?? "",
              subtitle: "Date Taken",
            },
            {
              title: totalTime,
              subtitle: "Time Taken",
            },
          ]}
        />
      }
      leftContent={
        <div className="flex h-full w-full flex-col p-4">
          <div className="mb-4 flex w-full items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-theme-900">
              Interview Media
            </h2>
            <Button
              variant="secondary"
              className="gap-2"
              size="sm"
              onClick={() =>
                handleDownload(
                  currentResponseMediaUrl,
                  currentResponseContentType,
                  selectedResponseId,
                  `response_${selectedResponseId}`,
                )
              }
              disabled={
                isDownloadingMedia ||
                !currentResponseMediaUrl ||
                !selectedResponseId
              }
            >
              {isDownloadingMedia ? (
                <ClipLoader color="black" size={16} />
              ) : (
                <Download size={16} className="text-theme-900" />
              )}
              {`Download ${currentResponseContentType?.startsWith("audio") ? "audio" : "video"}`}
            </Button>
          </div>
          <div className="flex-grow">
            {isLoadingMediaUrls ? (
              <div className="flex h-full w-full items-center justify-center">
                <ClipLoader color="grey" />
              </div>
            ) : currentResponseMediaUrl && currentResponseContentType ? (
              <BasicMediaViewer
                mediaUrl={currentResponseMediaUrl}
                mediaType={
                  currentResponseContentType.split("/")[0] as "video" | "audio"
                }
              />
            ) : (
              <p>No media available for this response.</p>
            )}
          </div>
        </div>
      }
      rightContent={
        <div className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Responses</h2>
          {isLoadingResponses ? (
            <div className="flex h-full w-full items-center justify-center">
              <ClipLoader color="grey" />
            </div>
          ) : filteredResponses.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredResponses.map((response: ExtendedResponse) => (
                <BasicCard
                  key={response.id}
                  className={`flex cursor-pointer flex-col gap-2 transition-all duration-200 ${
                    response.id === selectedResponseId
                      ? "bg-theme-50 shadow-md"
                      : "shadow hover:bg-theme-50"
                  }`}
                  shouldHover
                  isSelected={response.id === selectedResponseId}
                  onClick={() => setSelectedResponseId(response.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow font-semibold text-theme-900">
                      {response.followUpQuestion
                        ? response.followUpQuestion.title
                        : response.question.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-theme-500">
                    {response.followUpQuestion && (
                      <BasicTag className="py-0.5 text-xs">Follow Up</BasicTag>
                    )}
                    <span className="italic">
                      {formatDuration(
                        new Date(response.createdAt),
                        new Date(response.updatedAt),
                      )}
                    </span>
                  </div>
                  <div className="text-theme-600">
                    {`"${response.fastTranscribedText}"`}
                  </div>
                </BasicCard>
              ))}
            </div>
          ) : (
            <p>No responses available.</p>
          )}
        </div>
      }
    />
  );
};

export default InterviewSessionModal;
