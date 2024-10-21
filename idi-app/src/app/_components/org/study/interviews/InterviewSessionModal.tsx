import React, { useEffect, useState, useMemo } from "react";
import SplitScreenModal from "@/app/_components/layouts/org/SplitScreenModal";
import {
  InterviewSession,
  Response,
  Question,
  FollowUpQuestion,
  Study,
  InterviewSessionStatus,
  Favorite,
} from "@shared/generated/client";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import { api } from "@/trpc/react";
import { formatDuration, formatElapsedTime } from "@/app/utils/functions";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { ClipLoader } from "react-spinners";
import BasicTag from "@/app/_components/reusable/BasicTag";
import BasicMediaViewer from "@/app/_components/reusable/BasicMediaViewer";
import { useInterviewSessionMediaUrls } from "@/hooks/useInterviewSessionMediaUrls";
import { Button } from "@/components/ui/button";
import {
  CopySimple,
  DotsThree,
  Download,
  DownloadSimple,
  Info,
  Star,
} from "@phosphor-icons/react";
import { useMediaDownload } from "@/hooks/useMediaDownload";
import { Sparkle, Trash } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { showSuccessToast } from "@/app/utils/toastUtils";
import GeneralPopover from "@/app/_components/reusable/GeneralPopover";
import { useToast } from "@/hooks/use-toast";
import { ExtendedResponse, PauseInterval } from "@shared/types";
import { ResponseModalCard } from "@/app/_components/reusable/ResponseModalCard";
import { useDownloadInterviewTranscript } from "@/hooks/useDownloadInterviewTranscript";
import BasicPopover from "@/app/_components/reusable/BasicPopover";

interface InterviewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewSession: InterviewSession & {
    study: Study;
    Favorites: Favorite[];
  };
  studyId: string;
  orgId: string;
  refetchInterview: () => void;
}

const InterviewSessionModal: React.FC<InterviewSessionModalProps> = ({
  isOpen,
  onClose,
  interviewSession,
  studyId,
  orgId,
  refetchInterview,
}) => {
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(
    null,
  );
  const [showFollowUps, setShowFollowUps] = useState(true);
  const { toast } = useToast();

  const {
    handleDownload: handleDownloadTranscript,
    isDownloading: isDownloadingTranscript,
  } = useDownloadInterviewTranscript({
    interviewId: interviewSession.id,
  });

  const {
    data: responsesData,
    isLoading: isLoadingResponses,
    refetch: refetchResponses,
  } = api.interviews.getInterviewSessionResponses.useQuery(
    { interviewSessionId: interviewSession.id, includeQuotes: true },
    { enabled: isOpen },
  );

  const { data: participantData, isLoading: isLoadingParticipant } =
    api.interviews.getInterviewSessionParticipant.useQuery(
      { interviewSessionId: interviewSession.id },
      { enabled: isOpen },
    );

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(interviewSession.Favorites?.length > 0 ?? false);
  }, [interviewSession.Favorites]);

  const createFavorite = api.favorites.createFavorite.useMutation();
  const removeFavorite = api.favorites.removeFavorite.useMutation();

  const hasSomeDemographicInfo = useMemo(() => {
    return (
      participantData &&
      (participantData?.demographicResponse?.name !== null ||
        participantData?.demographicResponse?.email !== null ||
        participantData?.demographicResponse?.phoneNumber !== null)
    );
  }, [participantData]);

  const filteredResponses = useMemo(
    () =>
      responsesData?.filter(
        (response) => response.fastTranscribedText !== "",
      ) ?? [],
    [responsesData],
  );

  const selectedResponseQuestionId = useMemo(() => {
    const selectedResponse = filteredResponses.find(
      (r) => r.id === selectedResponseId,
    );
    return selectedResponse?.questionId;
  }, [selectedResponseId, filteredResponses]);

  const { mediaUrls, loadingUrls, fetchMediaUrl } =
    useInterviewSessionMediaUrls({
      studyId,
      orgId,
    });

  const { handleDownload, isDownloading: isDownloadingMedia } =
    useMediaDownload({
      orgId: orgId,
      studyId: studyId,
      questionId: selectedResponseQuestionId ?? "",
    });

  useEffect(() => {
    if (!isOpen) {
      setSelectedResponseId(null);
    } else if (filteredResponses.length > 0 && !selectedResponseId) {
      const firstResponse = filteredResponses[0];
      if (firstResponse && firstResponse.id) {
        setSelectedResponseId(firstResponse.id);
        fetchMediaUrl(firstResponse.id, firstResponse.questionId).catch(
          (err) => {
            console.log("Failed to fetch media url: ", err);
          },
        );
      }
    }
  }, [isOpen, filteredResponses, selectedResponseId, fetchMediaUrl]);

  useEffect(() => {
    if (selectedResponseId) {
      const selectedResponse = filteredResponses.find(
        (r) => r.id === selectedResponseId,
      );
      if (selectedResponse) {
        fetchMediaUrl(selectedResponseId, selectedResponse.questionId).catch(
          (err) => {
            console.log("Failed to fetch media url: ", err);
          },
        );
      }
    }
  }, [selectedResponseId, filteredResponses, fetchMediaUrl]);

  const calculateElapsedTime = (
    session: InterviewSession & { study: Study },
    responses: ExtendedResponse[],
  ) => {
    if (responses.length === 0) return 0;

    const firstResponseTime = new Date(
      responses[0]!.createdAt ?? session.startTime,
    ).getTime();
    const lastResponseTime = new Date(session.lastUpdatedTime!).getTime();
    let elapsedTime = lastResponseTime - firstResponseTime;

    // Calculate total pause duration
    const totalPauseDuration = (
      (session.pauseIntervals as PauseInterval[]) ?? []
    ).reduce((total, interval) => {
      if (
        typeof interval === "object" &&
        interval !== null &&
        "startTime" in interval
      ) {
        const start = new Date(interval.startTime).getTime();
        const end = interval.endTime
          ? new Date(interval.endTime).getTime()
          : Date.now();
        return total + (end - start);
      }
      return total;
    }, 0);

    elapsedTime -= totalPauseDuration;

    if (session.study.targetLength !== null) {
      const maxTime = session.study.targetLength * 1.25 * 60 * 1000; // Convert minutes to milliseconds
      return Math.min(elapsedTime, maxTime);
    } else {
      return elapsedTime;
    }
  };

  const totalTime = useMemo(() => {
    return formatElapsedTime(
      calculateElapsedTime(
        interviewSession,
        filteredResponses as ExtendedResponse[],
      ),
    );
  }, [interviewSession, filteredResponses]);

  const currentResponseMediaUrl =
    mediaUrls[selectedResponseId ?? ""]?.signedUrl;
  const currentResponseContentType =
    mediaUrls[selectedResponseId ?? ""]?.contentType;
  const isLoadingCurrentMedia = loadingUrls[selectedResponseId ?? ""] ?? false;

  if (!studyId || !orgId) {
    return null;
  }

  const copyInterviewThread = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!filteredResponses || filteredResponses.length === 0) return;

    const formattedThread = filteredResponses
      .map((response) => {
        const questionTitle = response.followUpQuestion
          ? response.followUpQuestion.title
          : `${response.question.questionOrder + 1}: ${response.question.title}`;
        const questionType = response.followUpQuestion
          ? "Follow Up Question"
          : "Question";

        return `${questionType}: "${questionTitle}"\n\nAnswer: "${response.fastTranscribedText}"\n\n\n`;
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

  const copyIndividualResponse = (
    response: Response & {
      question: Question | null;
      followUpQuestion: FollowUpQuestion | null;
    },
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    const questionTitle = !response.followUpQuestion
      ? response.question?.title
      : response.followUpQuestion?.title;
    const questionType = response.followUpQuestion
      ? "Follow Up"
      : "Original Question";

    const formattedResponse = `${questionType}: "${questionTitle}"\nAnswer: "${response.fastTranscribedText}"`;

    navigator.clipboard
      .writeText(formattedResponse)
      .then(() => {
        showSuccessToast("Response copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy response: ", err);
      });
  };

  const copySummary = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (interviewSession.summary) {
      navigator.clipboard
        .writeText(interviewSession.summary)
        .then(() => {
          showSuccessToast("Summary copied to clipboard");
        })
        .catch((err) => {
          console.error("Failed to copy summary: ", err);
        });
    }
  };

  const handleDownloadWrapper = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await handleDownload({
        currentResponseMediaUrl,
        currentResponseContentType,
        currentResponseId: selectedResponseId,
        fileName: `${interviewSession.study.title}_Question_${selectedResponseQuestionId}_Response_${selectedResponseId}`,
        isAudio: currentResponseContentType?.split("/")[0] === "audio",
      });
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const exportTranscript = async () => {
    try {
      await handleDownloadTranscript(
        `${interviewSession.study.title}_${participantData?.demographicResponse?.name ?? "Anonymous Participant"}_${interviewSession.startTime?.toDateString() ?? ""}`,
      );
      toast({
        title: "Exported Transcript",
        variant: "default",
        duration: 1500,
      });
    } catch (error) {
      console.error("Failed to export transcript: ", error);
    }
  };

  const handleToggleFavorite = async () => {
    // e.stopPropagation();
    setIsFavorite((prev) => !prev);

    if (isFavorite) {
      toast({
        title: "Removed from favorites",
        variant: "default",
        duration: 1500,
      });
      await removeFavorite.mutateAsync({
        favoriteId: interviewSession.Favorites[0]?.id ?? "",
      });

      refetchInterview();
    } else {
      toast({
        title: "Interview added to Favorites!",
        variant: "default",
        duration: 1500,
      });
      await createFavorite.mutateAsync({
        interviewSessionId: interviewSession.id,
        studyId: interviewSession.studyId,
      });

      refetchInterview();
    }
  };

  return (
    <SplitScreenModal
      isOpen={isOpen}
      onClose={onClose}
      topContent={
        <BasicHeaderCard
          items={[
            {
              title: interviewSession.startTime?.toDateString() ?? "",
              subtitle: "Date",
            },
            { title: totalTime, subtitle: "Duration" },
            {
              title:
                interviewSession.status === InterviewSessionStatus.COMPLETED
                  ? "Completed"
                  : "In Progress",
              subtitle: "Status",
            },
            {
              title: "",
              subtitle: "",
              childNode: (
                <BasicPopover
                  trigger={
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex gap-2"
                    >
                      Actions <Star size={16} color="black" />{" "}
                      <DownloadSimple size={16} color="black" />
                    </Button>
                  }
                  options={[
                    {
                      text: `${isFavorite ? "Unfavorite" : "Favorite"} Interview`,
                      icon: (
                        <Star
                          size={16}
                          weight={isFavorite ? "fill" : "regular"}
                          className={
                            isFavorite ? "text-yellow-400" : "text-theme-900"
                          }
                        />
                      ),
                      onClick: () => {
                        handleToggleFavorite().catch((err) => {
                          console.error("Failed to toggle favorite: ", err);
                        });
                      },
                    },
                    {
                      text: `Export Transcript`,
                      icon: (
                        <DownloadSimple size={16} className="text-theme-900" />
                      ),
                      onClick: () => {
                        exportTranscript().catch((err) => {
                          console.error("Failed to export transcript: ", err);
                        });
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      }
      leftContent={
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full items-center justify-between gap-3">
            {isLoadingParticipant ? (
              <div className="">
                <ClipLoader color="grey" size={12} />
              </div>
            ) : hasSomeDemographicInfo ? (
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-lg font-semibold text-theme-900">
                  {participantData?.demographicResponse?.name ??
                    "No name provided"}
                </h2>
                <GeneralPopover
                  trigger={
                    <div className="mt-[2px] flex cursor-pointer items-center gap-1 text-xs font-light text-theme-600">
                      see participant
                      <Info size={12} className="text-theme-600" />
                    </div>
                  }
                  align="start"
                  content={
                    <div className="flex min-w-96 flex-col gap-2 p-6">
                      {participantData?.demographicResponse?.name && (
                        <div className="flex justify-between text-sm">
                          <div className="text-theme-900">Name</div>
                          <div className="flex items-center gap-2 text-theme-600">
                            {participantData?.demographicResponse?.name}{" "}
                            <CopySimple
                              size={14}
                              className="cursor-pointer text-theme-900"
                              onClick={async () => {
                                await navigator.clipboard.writeText(
                                  participantData?.demographicResponse?.name ??
                                    "",
                                );
                                toast({
                                  title: "Name copied to clipboard",
                                  variant: "default",
                                });
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {participantData?.demographicResponse?.email && (
                        <div className="flex justify-between text-sm">
                          <div className="text-theme-900">Email</div>
                          <div className="flex items-center gap-2 text-theme-600">
                            {participantData?.demographicResponse?.email}{" "}
                            <CopySimple
                              size={14}
                              className="cursor-pointer text-theme-900"
                              onClick={async () => {
                                await navigator.clipboard.writeText(
                                  participantData?.demographicResponse?.email ??
                                    "",
                                );
                                toast({
                                  title: "Email copied to clipboard",
                                  variant: "default",
                                });
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {participantData?.demographicResponse?.phoneNumber && (
                        <div className="flex justify-between text-sm">
                          <div className="text-theme-900">Phone Number</div>
                          <div className="flex items-center gap-2 text-theme-600">
                            {participantData?.demographicResponse?.phoneNumber}{" "}
                            <CopySimple
                              size={14}
                              className="cursor-pointer text-theme-900"
                              onClick={async () => {
                                await navigator.clipboard.writeText(
                                  participantData?.demographicResponse
                                    ?.phoneNumber ?? "",
                                );
                                toast({
                                  title: "Phone number copied to clipboard",
                                  variant: "default",
                                });
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  }
                />
              </div>
            ) : (
              <h2 className="text-lg font-semibold text-theme-900">
                Anonymous Participant
              </h2>
            )}
            <Button
              variant="secondary"
              className="gap-2"
              size="sm"
              onClick={handleDownloadWrapper}
              disabled={
                isDownloadingMedia ||
                !currentResponseMediaUrl ||
                !selectedResponseId
              }
            >
              {isDownloadingMedia ? (
                <ClipLoader color="grey" size={16} />
              ) : (
                <Download size={16} className="text-theme-900" />
              )}
              {`Download ${currentResponseContentType?.startsWith("audio") ? "audio" : "video"}`}
            </Button>
          </div>
          <div className="h-[1px] w-full bg-theme-200 text-theme-900"></div>

          <div className="h-fit w-full">
            {isLoadingCurrentMedia ? (
              <div className="flex h-72 w-full items-center justify-center">
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
              <div className="flex h-full w-full items-center justify-center">
                <ClipLoader color="grey" />
              </div>
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
              onClick={copySummary}
            >
              Copy Summary <CopySimple size={16} className="text-theme-900" />
            </Button>
          </div>
          <div className="h-[1px] w-full bg-theme-200 text-theme-900"></div>
          <div className="mb-4 text-sm text-theme-600">
            {interviewSession.summary && interviewSession.summary !== "" ? (
              <>
                {interviewSession.summary
                  .split("\n")
                  .map((line, index, array) => {
                    if (index === 0) {
                      // Preamble
                      return (
                        <p key={index} className="mb-3">
                          {line}
                        </p>
                      );
                    } else if (index === array.length - 1) {
                      // Conclusion
                      return (
                        <p key={index} className="mt-3">
                          {line}
                        </p>
                      );
                    } else if (line.startsWith("- ")) {
                      // Bullet point
                      return (
                        <li key={index} className="mb-2 ml-5">
                          {line.substring(2)}
                        </li>
                      );
                    } else if (line.trim() === "") {
                      // Empty line, likely separating sections
                      return null;
                    } else {
                      // Any other line (shouldn't occur given the prompt, but just in case)
                      return (
                        <p key={index} className="mb-2">
                          {line}
                        </p>
                      );
                    }
                  })}
              </>
            ) : (
              "Summary has not been generated yet. Check back soon!"
            )}
          </div>

          <div className="flex w-full items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Responses</h2>
            <div className="flex items-center gap-2">
              <Button
                className="flex items-center gap-1"
                variant="secondary"
                size="sm"
                onClick={copyInterviewThread}
              >
                Copy Interview Thread{" "}
                <CopySimple size={16} className="text-theme-900" />
              </Button>
            </div>
          </div>
          <div className="h-[1px] w-full bg-theme-200 text-theme-900"></div>
          {isLoadingResponses ? (
            <div className="flex h-72 w-full items-center justify-center">
              <ClipLoader color="grey" />
            </div>
          ) : filteredResponses.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredResponses
                .filter(
                  (response) => showFollowUps || !response.followUpQuestion,
                )
                .map((response) => (
                  <ResponseModalCard
                    key={response.id}
                    response={response as ExtendedResponse}
                    currentResponseId={selectedResponseId ?? ""}
                    onResponseClicked={(response) =>
                      setSelectedResponseId(response.id)
                    }
                    copyIndividualResponse={copyIndividualResponse}
                    refetchResponses={refetchResponses}
                  />
                ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-theme-600">
              No responses available.
            </p>
          )}
        </div>
      }
    />
  );
};

export default InterviewSessionModal;
