"use client";

import BasicCard from "@/app/_components/reusable/BasicCard";
import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicSelect from "@/app/_components/reusable/BasicSelect";
import BasicTextArea from "@/app/_components/reusable/BasicTextArea";
import BasicTitleSection from "@/app/_components/reusable/BasicTitleSection";
import TextEntryGroup, {
  TextEntry,
} from "@/app/_components/reusable/TextEntryGroup";
import { Button } from "@/components/ui/button";
import { useTextEntries } from "@/hooks/useTextEntries";
import { api } from "@/trpc/react";
import { ArrowRight, DotsThree, Trash } from "@phosphor-icons/react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Language, StudyStatus } from "@shared/generated/client";
import { ClipLoader } from "react-spinners";
import { BasicProgressBar } from "@/app/_components/reusable/BasicProgressBar";
import { showErrorToast } from "@/app/utils/toastUtils";
import { useRouter } from "next/navigation";
import BasicTag from "@/app/_components/reusable/BasicTag";
import BasicPopover from "@/app/_components/reusable/BasicPopover";
import BasicConfirmationModal from "@/app/_components/reusable/BasicConfirmationModal";

export default function SetupOverviewPage({
  params,
}: {
  params: { studyId: string };
}) {
  const router = useRouter();
  const { data: study, isLoading } = api.studies.getStudy.useQuery(
    {
      studyId: params.studyId,
      includeBoostedKeywords: true,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  const updateStudyMutation = api.studies.updateStudy.useMutation();
  const deleteStudyMutation = api.studies.deleteStudy.useMutation();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    studyBackground: "",
    welcomeDescription: "",
    termsAndConditions: "",
    videoEnabled: false,
    targetLength: null as number | null,
    maxResponses: null as number | null,
  });

  const [errors, setErrors] = useState({
    title: "",
    videoEnabled: "",
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialEntries = useMemo(
    () =>
      study?.boostedKeywords?.map((kw) => ({
        field1: kw.keyword,
        field2: kw.definition ?? "",
        id: kw.id,
      })) ?? [],
    [study?.boostedKeywords],
  );

  const handleEntriesChange = useCallback((newEntries: TextEntry[]) => {
    setHasUnsavedChanges(true);
  }, []);

  const { entries, addEntry, removeEntry, updateEntries } = useTextEntries(
    initialEntries,
    true,
    handleEntriesChange,
  );

  useEffect(() => {
    if (study) {
      setFormData({
        title: study.title ?? "",
        studyBackground: study.studyBackground ?? "",
        welcomeDescription: study.welcomeDescription ?? "",
        termsAndConditions: study.termsAndConditions ?? "",
        videoEnabled: study.videoEnabled ?? false,
        targetLength: study.targetLength ?? null,
        maxResponses: study.maxResponses ?? null,
      });
      setHasUnsavedChanges(false);
    }
  }, [study]);

  const handleInputChange = useCallback(
    (name: string) => (value: string) => {
      setFormData((prev) => {
        if (name === "targetLength" || name === "maxResponses") {
          const numValue = value === "" ? null : parseInt(value, 10);
          return {
            ...prev,
            [name]: isNaN(numValue!) ? null : numValue,
          };
        }
        return { ...prev, [name]: value };
      });
      setHasUnsavedChanges(true);
    },
    [],
  );

  const handleSelectChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, videoEnabled: value === "true" }));
    setHasUnsavedChanges(true);
  }, []);

  const validateForm = useCallback(() => {
    let isValid = true;
    const newErrors = { title: "", videoEnabled: "" };

    if (!formData.title.trim()) {
      newErrors.title = "Study title is required";
      isValid = false;
    }

    if (formData.videoEnabled === undefined) {
      newErrors.videoEnabled = "Response recording option is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [formData.title, formData.videoEnabled]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    try {
      await updateStudyMutation.mutateAsync({
        id: params.studyId,
        ...formData,
        boostedKeywords: entries.map((entry) => ({
          keyword: entry.field1,
          definition: entry.field2,
        })),
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      showErrorToast("Failed to save study");
      console.error("Failed to save study:", error);
    }
  }, [formData, entries, params.studyId, updateStudyMutation, validateForm]);

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center bg-theme-off-white">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );

  return (
    <div className="flex h-full flex-col gap-10 overflow-y-auto bg-theme-off-white p-9">
      <BasicConfirmationModal
        isOpen={showSaveConfirmation}
        onOpenChange={setShowSaveConfirmation}
        title="Save these study details?"
        confirmButtonText={
          study?.status === StudyStatus.DRAFT
            ? "Save and continue"
            : "Save and update"
        }
        cancelButtonText="Cancel"
        body={
          <div>
            {updateStudyMutation.isPending && (
              <div className="flex items-center justify-center py-4">
                <ClipLoader size={20} color="grey" />
              </div>
            )}
          </div>
        }
        onCancel={() => {
          setShowSaveConfirmation(false);
        }}
        onConfirm={async () => {
          try {
            await handleSave();
            if (study?.status === StudyStatus.DRAFT) {
              router.push(
                `/org/${study?.organizationId}/study/${study?.id}/setup/questions`,
              );
            } else {
              router.push(
                `/org/${study?.organizationId}/study/${study?.id}/results`,
              );
            }
          } catch (error) {
            showErrorToast("Failed to delete draft");
            console.error("Failed to delete draft:", error);
          }
        }}
      />
      <BasicConfirmationModal
        isOpen={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
        title="Delete this draft?"
        subtitle="This action cannot be undone."
        confirmButtonText="Delete Draft"
        confirmButtonColor="!bg-red-500"
        cancelButtonText="Cancel"
        body={
          <div>
            {deleteStudyMutation.isPending && (
              <div className="flex items-center justify-center py-4">
                <ClipLoader size={20} color="grey" />
              </div>
            )}
          </div>
        }
        onCancel={() => {
          setShowDeleteConfirmation(false);
        }}
        onConfirm={async () => {
          try {
            await deleteStudyMutation.mutateAsync({
              studyId: params.studyId,
            });

            router.push(`/org/${study?.organizationId}/studies`);
          } catch (error) {
            showErrorToast("Failed to delete draft");
            console.error("Failed to delete draft:", error);
          }
        }}
      />
      <div className="flex flex-col gap-2">
        <div className="flex w-full flex-row items-center justify-between">
          <div className="text-lg font-medium text-theme-900">Study Setup</div>
          <div className="flex items-center gap-2 text-sm text-theme-600">
            {study?.status === StudyStatus.DRAFT ? (
              <BasicTag>Draft</BasicTag>
            ) : (
              <BasicTag color="bg-[#CEDBD3]" borderColor="border-[#427356]">
                Published
              </BasicTag>
            )}
            {study?.status === StudyStatus.DRAFT && (
              <BasicPopover
                trigger={
                  <DotsThree
                    className="cursor-pointer text-theme-900"
                    size={20}
                  />
                }
                options={[
                  {
                    text: "Delete this draft",
                    icon: <Trash />,
                    color: "text-red-500",
                    onClick: () => setShowDeleteConfirmation(true),
                  },
                ]}
              />
            )}
          </div>
        </div>
        <div className="text-sm text-theme-600">
          Create your study and get started distributing!
        </div>
      </div>
      <BasicCard className={`flex flex-col gap-6 p-6 shadow-standard`}>
        <div className="flex w-full flex-row items-center justify-between">
          <div className="text-lg text-theme-600">Overview</div>
          <div className="text-xs">
            {hasUnsavedChanges ? (
              <span className="text-sm font-semibold text-theme-900">
                Unsaved
              </span>
            ) : (
              <span className="text-theme-500">Saved</span>
            )}
          </div>
        </div>
        <BasicTitleSection
          title="Study Title*"
          subtitle="This title will be visible to participants in your interview."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <BasicInput
            type="text"
            name="title"
            value={formData.title}
            onSetValue={handleInputChange("title")}
            placeholder="Enter a title"
          />
          {errors.title && (
            <div className="ml-2 text-xs text-red-500">{errors.title}</div>
          )}
        </BasicTitleSection>
        <BasicTitleSection
          title="Study Goals"
          subtitle="Include the goals of the study, the overarching questions you're hoping to answer, and any other relevant background information to train our AI. This information will not be shown to the respondents. "
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <BasicTextArea
            name="studyBackground"
            value={formData.studyBackground}
            onSetValue={handleInputChange("studyBackground")}
            placeholder="Enter goals"
            rows={6}
            className="w-full"
          />
        </BasicTitleSection>
        <BasicTitleSection
          title="Welcome Page Message"
          subtitle="This message will be shown to your participants before they start your interview."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <BasicTextArea
            name="welcomeDescription"
            value={formData.welcomeDescription}
            onSetValue={handleInputChange("welcomeDescription")}
            placeholder="Enter message"
            rows={4}
            className="w-full"
          />
        </BasicTitleSection>
        <BasicTitleSection
          title="Terms of Service"
          subtitle="The terms of service will be shown to your participants before they start your interview."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <BasicTextArea
            name="termsAndConditions"
            value={formData.termsAndConditions}
            onSetValue={handleInputChange("termsAndConditions")}
            placeholder="Enter terms of service"
            rows={4}
            className="w-full"
          />
        </BasicTitleSection>
        <BasicTitleSection
          title="Response Recordings*"
          subtitle="Choose whether you want to record video or audio responses."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <BasicSelect
            options={[
              { value: "true", label: "Video" },
              { value: "false", label: "Audio" },
            ]}
            value={formData.videoEnabled.toString()}
            onValueChange={handleSelectChange}
          />
          {errors.videoEnabled && (
            <div className="ml-2 text-xs text-red-500">
              {errors.videoEnabled}
            </div>
          )}
        </BasicTitleSection>
        <BasicTitleSection
          title="Special Keywords"
          subtitle="Include any uncommon words or acronyms you expect respondents to use. This will improve transcription and AI analysis."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <TextEntryGroup
            entries={entries}
            onAdd={addEntry}
            onRemove={removeEntry}
            onChange={updateEntries}
            addText="Add new keyword"
            field1Placeholder="Enter keyword"
            field2Placeholder="Enter definition (optional)"
          />
        </BasicTitleSection>
        <BasicTitleSection
          title="Target Length"
          subtitle="Set a target length for your interview. If the respondent exceeds this time by a significant margin, some follow up questions will be skipped."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <BasicInput
            type="number"
            name="targetLength"
            value={formData.targetLength?.toString() ?? ""}
            onSetValue={handleInputChange("targetLength")}
            placeholder="-"
          />
        </BasicTitleSection>
        <BasicTitleSection
          title="Maximum Responses"
          subtitle="Prevent interview access after a certain number of interviews have been completed."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <BasicInput
            type="number"
            name="maxResponses"
            value={formData.maxResponses?.toString() ?? ""}
            onSetValue={handleInputChange("maxResponses")}
            placeholder="-"
          />
        </BasicTitleSection>
        <Button
          className="mt-4 flex gap-2 text-theme-off-white"
          onClick={() => setShowSaveConfirmation(true)}
          disabled={updateStudyMutation.isPending || !hasUnsavedChanges}
        >
          {updateStudyMutation.isPending
            ? "Saving..."
            : study?.status === StudyStatus.DRAFT
              ? "Save and continue"
              : "Save and update"}
          <ArrowRight className="text-theme-off-white" />
        </Button>
        {(errors.title || errors.videoEnabled) && (
          <div className="text-xs text-red-500">
            Please fill out all required fields.
          </div>
        )}
        <div className="h-10" />
      </BasicCard>
    </div>
  );
}
