"use client";

import React, { useEffect, useState } from "react";
import {
  InterviewSession,
  InterviewSessionStatus,
  Study,
  Response,
  Favorite,
} from "@shared/generated/client";
import SplitScreenLayout from "@/app/_components/layouts/org/SplitScreenLayout";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import BasicTag from "@/app/_components/reusable/BasicTag";
import CardTable from "@/app/_components/reusable/CardTable";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDuration, formatElapsedTime } from "@/app/utils/functions";
import { api } from "@/trpc/react";
import { ClipLoader } from "react-spinners";
import { PauseInterval } from "@shared/types";
import {
  ArrowSquareOut,
  TextAlignLeft,
  Video,
  VideoCamera,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import BasicTabs from "@/app/_components/reusable/BasicTabs";
import DisplayFavoriteResponses from "./DisplayFavoriteResponses";
import DisplayFavoriteInterviews from "./DisplayFavoriteInterviews";

interface FavoritesPageComponentProps {
  studyId: string;
  orgId: string;
}

const FavoritesPageComponent: React.FC<FavoritesPageComponentProps> = ({
  studyId,
  orgId,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const {
    data: interviewData,
    isLoading,
    refetch: refetchInterviews,
  } = api.studies.getStudyInterviews.useQuery(
    {
      studyId: studyId,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  const [isExporting, setIsExporting] = useState(false);
  const [selectedTab, setSelectedTab] = useState(
    searchParams.get("tab") ?? "responses",
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && (tab === "responses" || tab === "interviews")) {
      setSelectedTab(tab);
    } else {
      // If no valid tab is in the URL, set it to "responses" by default
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("tab", "responses");
      router.replace(`${pathname}?${newSearchParams.toString()}`);
    }
  }, [searchParams, pathname, router]);

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", value);
    router.replace(`${pathname}?${newSearchParams.toString()}`);
  };

  if (isLoading || !interviewData) {
    return (
      <div className="flex h-full items-center justify-center bg-theme-off-white">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );
  }

  const renderTabContent = () => {
    if (selectedTab === "responses") {
      return <DisplayFavoriteResponses studyId={studyId} />;
    } else if (selectedTab === "interviews") {
      return <DisplayFavoriteInterviews studyId={studyId} />;
    }
  };

  return (
    <SplitScreenLayout
      mainContent={
        <div className="flex grow flex-col gap-4">
          <div className="flex w-full flex-row items-center justify-between">
            <div className="flex flex-col items-start gap-1">
              <div className="text-lg font-medium text-theme-900">
                Favorites
              </div>
              <div className="text-sm text-theme-600">
                Capture interesting moments, insightful comments, and relevant
                responses for future reference. Click the star icon to add
                favorites.
              </div>
            </div>
            {/* <Button
              variant="secondary"
              className="flex flex-row gap-2"
              onClick={() => {
                //
              }}
            >
              {isExporting ? (
                <ClipLoader size={16} color="grey" />
              ) : (
                <ArrowSquareOut size={16} className="text-theme-900" />
              )}
              Export Favorites
            </Button> */}
          </div>
          <BasicTabs
            options={[
              {
                title: "Responses",
                value: "responses",
                icon: <TextAlignLeft size={16} className="text-theme-900" />,
              },
              {
                title: "Interviews",
                value: "interviews",
                icon: <VideoCamera size={16} className="text-theme-900" />,
              },
            ]}
            onValueChange={handleTabChange}
            defaultValue={selectedTab}
          />
          {renderTabContent()}
        </div>
      }
      showRightContent={false}
      rightContent={null}
    />
  );
};

export default FavoritesPageComponent;
