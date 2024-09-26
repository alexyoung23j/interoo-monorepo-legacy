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
import { ArrowRight } from "@phosphor-icons/react";
import React, { useState, useEffect } from "react";
import { Language, StudyStatus } from "@shared/generated/client";
import { ClipLoader } from "react-spinners";
import { BasicProgressBar } from "@/app/_components/reusable/BasicProgressBar";
import { showErrorToast } from "@/app/utils/toastUtils";
import { useRouter } from "next/navigation";

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

  const [formData, setFormData] = useState({
    title: "",
    studyBackground: "",
    welcomeDescription: "",
    termsAndConditions: "",
    videoEnabled: false,
    targetLength: 0,
    maxResponses: 0,
  });

  const [errors, setErrors] = useState({
    title: "",
    videoEnabled: "",
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { entries, addEntry, removeEntry, updateEntries } = useTextEntries();

  useEffect(() => {
    if (study) {
      setFormData({
        title: study.title ?? "",
        studyBackground: study.studyBackground ?? "",
        welcomeDescription: study.welcomeDescription ?? "",
        termsAndConditions: study.termsAndConditions ?? "",
        videoEnabled: study.videoEnabled ?? false,
        targetLength: study.targetLength ?? 0,
        maxResponses: study.maxResponses ?? 0,
      });
      updateEntries(
        study.boostedKeywords?.map((kw) => ({
          field1: kw.keyword,
          field2: kw.definition ?? "",
          id: kw.id,
        })) ?? [],
      );
      setHasUnsavedChanges(false);
    }
  }, [study, updateEntries]);

  const handleInputChange = (name: string) => (value: string) => {
    setFormData((prev) => {
      if (name === "targetLength" || name === "maxResponses") {
        const numValue = parseInt(value, 10);
        return { ...prev, [name]: isNaN(numValue) ? 0 : numValue };
      }
      return { ...prev, [name]: value };
    });
    setHasUnsavedChanges(true);
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, videoEnabled: value === "true" }));
    setHasUnsavedChanges(true);
  };

  const handleTextEntryChange = (newEntries: TextEntry[]) => {
    updateEntries(newEntries);
    setHasUnsavedChanges(true);
  };

  const validateForm = () => {
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
  };

  const handleSave = async () => {
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
      router.push(
        `/org/${study?.organizationId}/study/${study?.id}/setup/questions`,
      );
      setHasUnsavedChanges(false);
    } catch (error) {
      // Handle error (e.g., show error message)
      showErrorToast("Failed to save study");
      console.error("Failed to save study:", error);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center bg-theme-off-white">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );

  return (
    <div className="flex h-full flex-col gap-10 overflow-y-auto bg-theme-off-white p-9">
      <div className="flex flex-col gap-2">
        <div className="flex w-full flex-row items-center justify-between">
          <div className="text-lg font-medium text-theme-900">Study Setup</div>
          <div className="text-sm text-theme-600">75% complete</div>
        </div>
        <div className="text-sm text-theme-600">
          Create your study and get started distributing!
        </div>
      </div>
      <BasicProgressBar value={50} />
      <BasicCard className={`flex flex-col gap-6 p-6 shadow-standard`}>
        <div className="flex w-full flex-row items-center justify-between">
          <div className="text-lg text-theme-600">Overview</div>
          <div className="text-xs">
            {hasUnsavedChanges ? (
              <span className="font-semibold text-theme-700">Unsaved</span>
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
          subtitle="This will be shown to your participants before they start your interview. "
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
          subtitle="This will be shown to your participants before they start your interview. "
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
          subtitle="This title will be visible to participants in your interview."
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
          subtitle="Include any uncommon words or acronyms you expect respondents to use."
          titleClassName="!font-medium"
          subtitleClassName="!font-normal"
        >
          <TextEntryGroup
            entries={entries}
            onAdd={addEntry}
            onRemove={removeEntry}
            onChange={handleTextEntryChange}
            addText="Add new entry"
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
            value={formData.targetLength.toString()}
            onSetValue={handleInputChange("targetLength")}
            placeholder="set a value"
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
            value={formData.maxResponses.toString()}
            onSetValue={handleInputChange("maxResponses")}
            placeholder="set a value"
          />
        </BasicTitleSection>
        <Button
          className="mt-4 flex gap-2 text-theme-off-white"
          onClick={handleSave}
          disabled={updateStudyMutation.isPending}
        >
          {updateStudyMutation.isPending ? "Saving..." : "Save and continue"}
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
