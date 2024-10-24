import React, { useMemo, useState } from "react";
import { FollowUpQuestion, Question, Response } from "@shared/generated/client";
import { ClipLoader } from "react-spinners";
import BasicCard from "@/app/_components/reusable/BasicCard";
import BasicTag from "@/app/_components/reusable/BasicTag";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { ExtendedStudy } from "./ResultsPageComponent";
import BasicMediaViewer from "@/app/_components/reusable/BasicMediaViewer";
import { useMediaSessionUrls } from "@/hooks/useMediaSessionUrls";
import { Button } from "@/components/ui/button";
import { CopySimple, Download, Info } from "@phosphor-icons/react";
import { useMediaDownload } from "@/hooks/useMediaDownload";
import { api } from "@/trpc/react";
import GeneralPopover from "@/app/_components/reusable/GeneralPopover";
import { useToast } from "@/hooks/use-toast";
import { useThemes } from "@/hooks/useThemes";

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
  interviewSessionId: string;
}

const QuestionModalLeftContent: React.FC<QuestionModalLeftContentProps> = ({
  responses,
  currentResponseId,
  study,
  question,
  interviewSessionId,
}) => {
  const { toast } = useToast();

  const {
    data: mediaUrlData,
    isLoading,
    error,
  } = useMediaSessionUrls({ responses, study, questionId: question.id });
  const { data: participantData, isLoading: isLoadingParticipant } =
    api.interviews.getInterviewSessionParticipant.useQuery({
      interviewSessionId: interviewSessionId,
    });

  const hasSomeDemographicInfo = useMemo(() => {
    return (
      participantData &&
      (participantData?.demographicResponse?.name !== null ||
        participantData?.demographicResponse?.email !== null ||
        participantData?.demographicResponse?.phoneNumber !== null)
    );
  }, [participantData]);

  const [isDownloading, setIsDownloading] = useState(false);

  const { handleDownload, isDownloading: isDownloadingMedia } =
    useMediaDownload({
      orgId: study.organizationId,
      studyId: study.id,
      questionId: question.id,
    });

  const { data: themes } = useThemes(study.id);

  if (!responses || !mediaUrlData || isLoading) {
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

  return (
    <div className="flex h-fit w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-3">
        {hasSomeDemographicInfo ? (
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg font-semibold text-theme-900">
              {participantData?.demographicResponse?.name ?? "No name provided"}
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
                              participantData?.demographicResponse?.name ?? "",
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
                              participantData?.demographicResponse?.email ?? "",
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
          onClick={() =>
            handleDownload({
              currentResponseMediaUrl,
              isAudio: currentResponseContentType?.split("/")[0] === "audio",
              currentResponseContentType,
              currentResponseId,
              fileName: `${study.title}_Question_${question.questionOrder + 1}_Response_${currentResponseId}`,
            })
          }
          disabled={isDownloading || !currentResponseMediaUrl}
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

      <div className="min-h-[80%] w-full flex-grow">
        <BasicMediaViewer
          mediaUrl={currentResponseMediaUrl ?? ""}
          mediaType={
            currentResponseContentType?.split("/")[0] as "video" | "audio"
          }
        />
      </div>

      {/* <div className="px-20 text-center text-sm text-theme-600">{`"${currentResponse?.fastTranscribedText}"`}</div> */}
    </div>
  );
};

export default QuestionModalLeftContent;
