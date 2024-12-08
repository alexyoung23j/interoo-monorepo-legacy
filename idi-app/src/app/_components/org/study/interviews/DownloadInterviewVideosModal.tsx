import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ExtendedResponse } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { useMediaDownload } from "@/hooks/useMediaDownload";
import { useInterviewSessionMediaUrls } from "@/hooks/useInterviewSessionMediaUrls";
import BasicConfirmationModal from "@/app/_components/reusable/BasicConfirmationModal";

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
    questionId: undefined,
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
    const questionNumber = response.question?.questionOrder ?? 0;
    const followUpNumber = response.followUpQuestion
      ? `_followup${response.followUpQuestion.followUpQuestionOrder}`
      : "";

    return `${baseName}_q${questionNumber}_${studyName}${followUpNumber}_${sessionId}`;
  };

  const handleBulkDownload = async () => {
    const selectedIds = Array.from(selectedResponses);
    const { id: toastId, update } = toast({
      title: "Download Progress",
      description: `Downloading 0/${selectedIds.length} files`,
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

        console.log("mediaUrl", mediaUrl);

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
      title: "Download Complete",
      description: `Successfully downloaded ${completed}/${selectedIds.length} files`,
      duration: 3000,
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

  return (
    <BasicConfirmationModal
      isOpen={isOpen}
      onOpenChange={onClose}
      title="Select Responses to Download"
      subtitle="Select which responses you'd like to download"
      onCancel={onClose}
      onConfirm={handleBulkDownload}
      confirmButtonText={`Download ${selectedResponses.size} Files`}
      body={
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedResponses.size === responses.length}
              onCheckedChange={toggleAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium text-theme-900"
            >
              Select All
            </label>
          </div>
          <div className="flex flex-col gap-2">
            {mainQuestions.map((question) => (
              <div key={question.id} className="flex flex-col gap-1">
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
                    className="text-sm text-theme-900"
                  >
                    Question {question.question?.questionOrder ?? 0}:{" "}
                    {question.question?.title}
                  </label>
                </div>
                {followUpsByMainQuestion[question.questionId]?.map(
                  (followUp) => (
                    <div
                      key={followUp.id}
                      className="ml-6 flex items-center gap-2"
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
                        className="text-sm text-theme-600"
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
