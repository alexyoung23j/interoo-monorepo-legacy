"use client";

import { InterviewScreenLayout } from "@/app/_components/interview/InterviewScreenLayout";
import { Organization } from "@shared/generated/client";

interface LimitPageContentProps {
  organization: Organization;
  isLight: boolean;
}

export default function LimitPageContent({
  organization,
  isLight,
}: LimitPageContentProps) {
  return (
    <InterviewScreenLayout
      organization={organization}
      backgroundLight={isLight}
      isLoading={false}
    >
      <div className="flex h-full items-center justify-center">
        <h1 className="w-[70%] text-center text-2xl text-neutral-500">
          This study has reached the maximum number of interviews. Please reach
          out to your coordinator for resolution.
        </h1>
      </div>
    </InterviewScreenLayout>
  );
}
