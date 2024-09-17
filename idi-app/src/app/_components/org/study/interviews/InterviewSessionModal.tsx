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
import { CopySimple, Download } from "@phosphor-icons/react";
import { useMediaDownload } from "@/hooks/useMediaDownload";
import { Sparkle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { showSuccessToast } from "@/app/utils/toastUtils";

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
  const [showFollowUps, setShowFollowUps] = useState(true);

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

  const copyInterviewThread = () => {
    if (!filteredResponses || filteredResponses.length === 0) return;

    const formattedThread = filteredResponses
      .map((response) => {
        const questionTitle = response.followUpQuestion
          ? response.followUpQuestion.title
          : `${response.question.questionOrder + 1}: ${response.question.title}`;
        const questionType = response.followUpQuestion
          ? "Follow Up"
          : "Original Question";

        return `${questionType}: "${questionTitle}"\nAnswer: "${response.fastTranscribedText}"\n`;
      })
      .join("\n");

    navigator.clipboard
      .writeText(formattedThread)
      .then(() => {
        console.log("Interview thread copied to clipboard");
        showSuccessToast("Interview thread copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy interview thread: ", err);
      });
  };

  return (
    <SplitScreenModal
      isOpen={isOpen}
      onClose={onClose}
      topContent={
        <BasicHeaderCard
          items={[
            {
              title: "Anonymous",
              subtitle: "Respondent",
            },
            {
              title: interviewSession.startTime?.toDateString() ?? "",
              subtitle: "Date",
            },
            {
              title: totalTime,
              subtitle: "Duration",
            },
          ]}
        />
      }
      leftContent={
        <div className="flex h-full w-full flex-col gap-4">
          <div className="flex w-full items-center justify-between gap-3">
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
          <div className="h-[1px] w-full bg-theme-200 text-theme-900"></div>

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
        <div className="flex h-fit w-full flex-col gap-4">
          <div className="flex w-full items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              Summary <Sparkle className="text-theme-900" size={16} />
            </h2>
            <Button
              className="flex items-center gap-1"
              variant="secondary"
              size="sm"
              onClick={copyInterviewThread}
            >
              {`Copy Interview Thread`}{" "}
              <CopySimple size={16} className="text-theme-900" />
            </Button>
          </div>
          <div className="h-[1px] w-full bg-theme-200 text-theme-900"></div>
          <div className="mb-4 text-sm text-theme-600">
            AI powered summaries coming soon!
          </div>

          <div className="flex w-full items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Responses</h2>
            <div className="flex items-center gap-2">
              <div className="text-xs font-light text-theme-600">
                Show Follow Ups
              </div>
              <Switch
                className="data-[state=checked]:bg-theme-500"
                checked={showFollowUps}
                onCheckedChange={(checked) => setShowFollowUps(checked)}
              />
            </div>
          </div>
          <div className="h-[1px] w-full bg-theme-200 text-theme-900"></div>
          {isLoadingResponses ? (
            <div className="flex h-full w-full items-center justify-center">
              <ClipLoader color="grey" />
            </div>
          ) : filteredResponses.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredResponses
                .filter(
                  (response) => showFollowUps || !response.followUpQuestion,
                )
                .map((response: ExtendedResponse) => (
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
                          : `${response.question.questionOrder + 1}: ${response.question.title}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-theme-500">
                      {response.followUpQuestion && (
                        <BasicTag className="py-0.5 text-xs">
                          Follow Up
                        </BasicTag>
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
