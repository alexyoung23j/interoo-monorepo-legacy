import React, { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ExtendedResponse } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { useMediaDownload } from "@/hooks/useMediaDownload";
import { useInterviewSessionMediaUrls } from "@/hooks/useInterviewSessionMediaUrls";
import BasicConfirmationModal from "@/app/_components/reusable/BasicConfirmationModal";
import { ClipLoader } from "react-spinners";

interface DownloadInterviewVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  responses: ExtendedResponse[];
  participantName: string | null;
  studyName: string;
  sessionId: string;
  orgId: string;
  studyId: string;
}

const DownloadInterviewVideosModal: React.FC<
  DownloadInterviewVideosModalProps
> = ({
  isOpen,
  onClose,
  responses,
  participantName,
  studyName,
  sessionId,
  orgId,
  studyId,
}) => {
  const [selectedResponses, setSelectedResponses] = useState<Set<string>>(
    new Set(),
  );
  const { toast } = useToast();
  const { handleDownload } = useMediaDownload({
    orgId,
    studyId,
  });
  const { fetchMediaUrlDirectly } = useInterviewSessionMediaUrls({
    studyId,
    orgId,
  });

  const mainQuestions = responses.filter((r) => !r.followUpQuestion);
  const followUpsByMainQuestion = responses.reduce(
    (acc, r) => {
      if (r.followUpQuestion && r.questionId) {
        if (!acc[r.questionId]) acc[r.questionId] = [];
        acc[r.questionId]?.push(r);
      }
      return acc;
    },
    {} as Record<string, ExtendedResponse[]>,
  );

  const getFileName = (response: ExtendedResponse) => {
    const baseName = participantName ?? "anonymous";
    const questionNumber = (response.question?.questionOrder ?? -1) + 1;
    const followUpNumber = response.followUpQuestion
      ? `_followup${response.followUpQuestion.followUpQuestionOrder}`
      : "";

    return `${baseName}_q${questionNumber}_${studyName}${followUpNumber}_${sessionId}`;
  };

  const handleBulkDownload = async () => {
    onClose();

    const selectedIds = Array.from(selectedResponses);

    const { id: toastId, update } = toast({
      title: "Download Progress",
      description: (
        <div className="flex flex-row items-center space-x-2">
          <ClipLoader size={16} color="#587785" />
          <span className="text-theme-900">
            Downloading 0/{selectedIds.length} files
          </span>
        </div>
      ),
      duration: Infinity,
    });

    let completed = 0;

    for (const responseId of selectedIds) {
      const response = responses.find((r) => r.id === responseId);
      if (!response) continue;

      try {
        const mediaUrl = await fetchMediaUrlDirectly(
          response.id,
          response.questionId,
        );

        if (!mediaUrl?.signedUrl || !mediaUrl?.contentType) {
          console.error(`No media URL available for response ${response.id}`);
          continue;
        }

        await handleDownload({
          currentResponseMediaUrl: mediaUrl.signedUrl,
          currentResponseContentType: mediaUrl.contentType,
          currentResponseId: response.id,
          fileName: getFileName(response),
          isAudio: mediaUrl.contentType === "audio",
          questionId: response.questionId,
          showToasts: false,
        });

        completed++;
        update({
          id: toastId,
          title: "Download Progress",
          description: `Downloaded ${completed}/${selectedIds.length} files`,
          duration: Infinity,
        });
      } catch (error) {
        console.error(`Failed to download response ${responseId}:`, error);
      }
    }

    update({
      id: toastId,
      title: "Download Complete 🎉",
      description: `Successfully downloaded ${completed}/${selectedIds.length} files`,
      duration: Infinity,
    });
    onClose();
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedResponses(new Set(responses.map((r) => r.id)));
    } else {
      setSelectedResponses(new Set());
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedResponses(new Set(responses.map((r) => r.id)));
    } else {
      setSelectedResponses(new Set());
    }
  }, [isOpen, responses]);

  const handleClose = () => {
    setSelectedResponses(new Set());
    onClose();
  };

  return (
    <BasicConfirmationModal
      isOpen={isOpen}
      onOpenChange={handleClose}
      title="Select Responses to Download"
      subtitle="Select which responses you'd like to download. Leave this tab open while downloading."
      onCancel={handleClose}
      onConfirm={handleBulkDownload}
      confirmButtonText={`Download ${selectedResponses.size} Files`}
      body={
        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedResponses.size === responses.length}
              onCheckedChange={toggleAll}
              className="data-[state=checked]:bg-theme-900"
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium text-theme-900"
            >
              Select All
            </label>
          </div>
          <div className="h-px w-full bg-theme-200" />

          <div className="scrollbar-thumb-theme-900 scrollbar-track-theme-200 flex max-h-[600px] flex-col gap-2 overflow-y-auto scrollbar-thin">
            {mainQuestions.map((question) => (
              <div key={question.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={question.id}
                    checked={selectedResponses.has(question.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedResponses);
                      if (checked) {
                        newSelected.add(question.id);
                      } else {
                        newSelected.delete(question.id);
                      }
                      setSelectedResponses(newSelected);
                    }}
                  />
                  <label
                    htmlFor={question.id}
                    className="max-w-[400px] truncate text-sm text-theme-900"
                  >
                    Question {(question.question?.questionOrder ?? -1) + 1}:{" "}
                    {question.question?.title}
                  </label>
                </div>
                {followUpsByMainQuestion[question.questionId]?.map(
                  (followUp) => (
                    <div
                      key={followUp.id}
                      className="ml-3 flex items-center gap-2"
                    >
                      <Checkbox
                        id={followUp.id}
                        checked={selectedResponses.has(followUp.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedResponses);
                          if (checked) {
                            newSelected.add(followUp.id);
                          } else {
                            newSelected.delete(followUp.id);
                          }
                          setSelectedResponses(newSelected);
                        }}
                      />
                      <label
                        htmlFor={followUp.id}
                        className="max-w-[400px] truncate text-sm font-light text-theme-900"
                      >
                        Follow-up{" "}
                        {followUp.followUpQuestion?.followUpQuestionOrder}:{" "}
                        {followUp.followUpQuestion?.title}
                      </label>
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
};

export default DownloadInterviewVideosModal;
