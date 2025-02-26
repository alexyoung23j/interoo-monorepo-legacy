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
import InterviewSessionModal from "./InterviewSessionModal";
import BasicTag from "@/app/_components/reusable/BasicTag";
import CardTable from "@/app/_components/reusable/CardTable";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDuration, formatElapsedTime } from "@/app/utils/functions";
import { api } from "@/trpc/react";
import { ClipLoader } from "react-spinners";
import { PauseInterval } from "@shared/types";
import { cn } from "@/lib/utils";

interface InterviewPageComponentProps {
  studyId: string;
  orgId: string;
}

const formatDate = (date: Date | null) => {
  return date
    ? new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";
};

const getStatusProps = (status: InterviewSessionStatus) => {
  switch (status) {
    case InterviewSessionStatus.COMPLETED:
      return { color: "bg-[#CEDBD3]", borderColor: "border-[#427356]" };
    case InterviewSessionStatus.IN_PROGRESS:
      return { color: "bg-[#D2C3D2]", borderColor: "border-[#734271]" };
    default:
      return { color: "bg-theme-100", borderColor: "border-theme-300" };
  }
};

const InterviewPageComponent: React.FC<InterviewPageComponentProps> = ({
  studyId,
  orgId,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  console.log("InterviewPageComponent");

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

  const [selectedInterview, setSelectedInterview] = useState<
    | (InterviewSession & {
        study: Study;
        responses: Response[];
        Favorites: Favorite[];
      })
    | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const interviewSessionId = searchParams.get("interviewSessionId");
    const modalOpen = searchParams.get("modalOpen");

    if (interviewSessionId) {
      const interview =
        interviewData?.interviewSessions.find(
          (i) => i.id === interviewSessionId,
        ) ?? null;
      setSelectedInterview(interview);
    }

    if (modalOpen === "true") {
      setIsModalOpen(true);
    }
  }, [searchParams, interviewData?.interviewSessions]);

  const columns = [
    { key: "respondent", header: "Respondent", width: "33%" },
    {
      key: "dateTaken",
      header: "Date Taken",
      width: "22%",
      className: "justify-end",
    },
    {
      key: "timeTaken",
      header: "Duration",
      width: "22%",
      className: "justify-end",
    },
    { key: "status", header: "Status", width: "23%", className: "justify-end" },
  ];

  const calculateElapsedTime = (
    session: InterviewSession & { study: Study; responses: Response[] },
  ) => {
    const startTime = new Date(
      session.responses[0]?.createdAt ?? session.startTime!,
    ).getTime();
    const endTime = new Date(session.lastUpdatedTime!).getTime();
    let elapsedTime = endTime - startTime;

    // Calculate total pause duration
    const totalPauseDuration = (
      (session.pauseIntervals as PauseInterval[]) ?? []
    ).reduce((total, interval) => {
      if (
        typeof interval === "object" &&
        interval !== null &&
        "startTime" in interval
      ) {
        const pauseStart = new Date(interval.startTime).getTime();
        const pauseEnd = interval.endTime
          ? new Date(interval.endTime).getTime()
          : Date.now();
        return total + (pauseEnd - pauseStart);
      }
      return total;
    }, 0);

    // Subtract total pause duration from elapsed time
    elapsedTime -= totalPauseDuration;

    if (session.study.targetLength !== null) {
      const maxTime = session.study.targetLength * 1.25 * 60 * 1000; // Convert minutes to milliseconds
      return Math.min(elapsedTime, maxTime);
    } else {
      return elapsedTime;
    }
  };

  const calculateAverageCompletionTime = () => {
    const completedInterviews = interviewData?.interviewSessions.filter(
      (session) => session.status === InterviewSessionStatus.COMPLETED,
    );

    if (completedInterviews?.length === 0) return "N/A";

    const totalElapsedTime =
      completedInterviews?.reduce(
        (sum, session) => sum + calculateElapsedTime(session),
        0,
      ) ?? 0;
    const averageElapsedTime = Math.round(
      totalElapsedTime / (completedInterviews?.length ?? 1),
    );

    return formatElapsedTime(averageElapsedTime);
  };

  const sortedInterviewData = React.useMemo(() => {
    if (!interviewData?.interviewSessions) return [];

    return [...interviewData.interviewSessions].sort((a, b) => {
      // If both are completed, sort by lastUpdatedTime
      if (
        a.status === InterviewSessionStatus.COMPLETED &&
        b.status === InterviewSessionStatus.COMPLETED
      ) {
        return (
          new Date(b.lastUpdatedTime ?? 0).getTime() -
          new Date(a.lastUpdatedTime ?? 0).getTime()
        );
      }

      // If only one is completed, completed ones come first
      if (a.status === InterviewSessionStatus.COMPLETED) return -1;
      if (b.status === InterviewSessionStatus.COMPLETED) return 1;

      // For non-completed interviews, sort by startTime
      return (
        new Date(b.startTime ?? 0).getTime() -
        new Date(a.startTime ?? 0).getTime()
      );
    });
  }, [interviewData?.interviewSessions]);

  const tableData = sortedInterviewData.map((session) => ({
    respondent: session.participant?.demographicResponse?.name ?? "Anonymous",
    dateTaken: (
      <div className="text-xs font-light text-theme-600">
        {session.status === InterviewSessionStatus.COMPLETED
          ? formatDate(session.lastUpdatedTime)
          : formatDate(session.startTime)}
      </div>
    ),
    timeTaken: (
      <div className="text-xs font-light text-theme-600">
        {formatElapsedTime(calculateElapsedTime(session))}
      </div>
    ),
    status: (
      <BasicTag {...getStatusProps(session.status)} fixedWidth={false}>
        {session.status === InterviewSessionStatus.COMPLETED
          ? "Completed"
          : "In Progress"}
      </BasicTag>
    ),
    originalSession: session,
  }));

  if (isLoading || !interviewData) {
    return (
      <div className="flex h-full items-center justify-center bg-theme-off-white">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );
  }

  return (
    <>
      <SplitScreenLayout
        mainContent={
          <div className="flex flex-col gap-4">
            <div className="flex w-full flex-row items-center justify-between">
              <div className="text-lg font-medium text-theme-900">
                Interview Statistics
              </div>
            </div>
            <BasicHeaderCard
              items={[
                {
                  title: interviewData.completedInterviewsCount.toString(),
                  subtitle: "Completed Interviews",
                },
                {
                  title: interviewData.inProgressInterviewsCount.toString(),
                  subtitle: "Incomplete Interviews",
                },
                {
                  title: calculateAverageCompletionTime(),
                  subtitle: "Avg. Completion Time",
                },
              ]}
            />
            <div className="mt-8 text-lg font-medium text-theme-900">
              Interviews
            </div>
            <CardTable
              data={tableData ?? []}
              columns={columns}
              onRowClick={(row) => {
                setSelectedInterview(row.originalSession);
                setIsModalOpen(true);
                router.push(
                  `${pathname}?interviewSessionId=${row.originalSession.id}&modalOpen=true`,
                );
              }}
              rowClassName={(row) =>
                cn(
                  "transition-colors duration-200",
                  selectedInterview?.id === row.originalSession.id
                    ? "bg-theme-50"
                    : "bg-theme-off-white hover:bg-theme-50",
                )
              }
              rowStyle={(row) => ({
                ...(selectedInterview?.id === row.originalSession.id
                  ? {
                      boxShadow: "0 0 0 1px var(--theme-500)",
                    }
                  : {}),
              })}
            />
          </div>
        }
        showRightContent={false}
        rightContent={null}
      />
      {selectedInterview && (
        <InterviewSessionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedInterview(null);
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete("modalOpen");
            router.push(`${pathname}?${newSearchParams.toString()}`);
          }}
          interviewSession={selectedInterview}
          studyId={studyId}
          orgId={orgId}
          refetchInterview={refetchInterviews}
        />
      )}
    </>
  );
};

export default InterviewPageComponent;
