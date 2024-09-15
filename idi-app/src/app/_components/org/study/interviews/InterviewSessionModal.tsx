import React, { useEffect, useState } from "react";
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

  const { data: mediaUrlData, isLoading: isLoadingMediaUrls } =
    useInterviewSessionMediaUrls({
      responses: responsesData ?? null,
      studyId,
      orgId,
    });

  useEffect(() => {
    if (!isOpen) {
      setSelectedResponseId(null);
    } else if (
      responsesData &&
      responsesData.length > 0 &&
      !selectedResponseId
    ) {
      setSelectedResponseId(responsesData[0].id);
    }
  }, [isOpen, responsesData, selectedResponseId]);

  const totalTime =
    interviewSession.startTime && interviewSession.lastUpdatedTime
      ? formatDuration(
          new Date(interviewSession.startTime),
          new Date(interviewSession.lastUpdatedTime),
        )
      : "0:00";

  const filteredResponses =
    responsesData?.filter((response) => response.fastTranscribedText !== "") ??
    [];

  const currentResponseMediaUrl =
    mediaUrlData?.signedUrls[selectedResponseId ?? ""]?.signedUrl;
  const currentResponseContentType =
    mediaUrlData?.signedUrls[selectedResponseId ?? ""]?.contentType;

  return (
    <SplitScreenModal
      isOpen={isOpen}
      onClose={onClose}
      topContent={
        <BasicHeaderCard
          items={[
            {
              title: interviewSession.status,
              subtitle: "Study",
            },
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
          <h2 className="mb-4 text-xl font-bold">Interview Details</h2>
          <p>Interview ID: {interviewSession.id}</p>
          <p>
            Started: {new Date(interviewSession.startTime!).toLocaleString()}
          </p>
          {selectedResponseId && (
            <>
              <p className="mt-4">
                <strong>Selected Response ID:</strong> {selectedResponseId}
              </p>
              <div className="mt-4 h-64 w-full">
                {isLoadingMediaUrls ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <ClipLoader color="grey" />
                  </div>
                ) : currentResponseMediaUrl ? (
                  <BasicMediaViewer
                    mediaUrl={currentResponseMediaUrl}
                    mediaType={currentResponseContentType as "video" | "audio"}
                  />
                ) : (
                  <p>No media available for this response.</p>
                )}
              </div>
            </>
          )}
        </div>
      }
      rightContent={
        <div className="p-4">
          <h2 className="mb-4 text-xl font-bold">Responses</h2>
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
