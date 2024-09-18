"use client";

import React, { useEffect, useState } from "react";
import {
  InterviewSession,
  InterviewSessionStatus,
  Study,
} from "@shared/generated/client";
import SplitScreenLayout from "@/app/_components/layouts/org/SplitScreenLayout";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import InterviewSessionModal from "./InterviewSessionModal";
import BasicTag from "@/app/_components/reusable/BasicTag";
import CardTable from "@/app/_components/reusable/CardTable";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDuration, formatElapsedTime } from "@/app/utils/functions";

interface InterviewPageComponentProps {
  interviewData: {
    interviewSessions: (InterviewSession & { study: Study })[];
    completedInterviewsCount: number;
    inProgressInterviewsCount: number;
  };
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
  interviewData,
  studyId,
  orgId,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedInterview, setSelectedInterview] =
    useState<InterviewSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const interviewSessionId = searchParams.get("interviewSessionId");
    const modalOpen = searchParams.get("modalOpen");

    if (interviewSessionId) {
      const interview =
        interviewData.interviewSessions.find(
          (i) => i.id === interviewSessionId,
        ) ?? null;
      setSelectedInterview(interview);
    }

    if (modalOpen === "true") {
      setIsModalOpen(true);
    }
  }, [searchParams, interviewData.interviewSessions]);

  const columns = [
    { key: "respondent", header: "Respondent", width: "33%" },
    {
      key: "dateTaken",
      header: "Date Started",
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
    session: InterviewSession & { study: Study },
  ) => {
    const elapsedTime =
      new Date(session.lastUpdatedTime!).getTime() -
      new Date(session.startTime!).getTime();

    if (session.study.targetLength === null) {
      // If targetLength is null, cap at 1 hour (3,600,000 milliseconds)
      return Math.min(elapsedTime, 3600000);
    } else {
      const maxTime = session.study.targetLength * 1.25 * 60 * 1000; // Convert minutes to milliseconds
      return Math.min(elapsedTime, maxTime);
    }
  };

  const calculateAverageCompletionTime = () => {
    const completedInterviews = interviewData.interviewSessions.filter(
      (session) => session.status === InterviewSessionStatus.COMPLETED,
    );

    if (completedInterviews.length === 0) return "N/A";

    const totalElapsedTime = completedInterviews.reduce(
      (sum, session) => sum + calculateElapsedTime(session),
      0,
    );
    const averageElapsedTime = Math.round(
      totalElapsedTime / completedInterviews.length,
    );

    return formatElapsedTime(averageElapsedTime);
  };

  const tableData = interviewData.interviewSessions.map((session) => ({
    respondent: "Anonymous",
    dateTaken: (
      <div className="text-xs font-light text-theme-600">
        {formatDate(session.startTime)}
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
            <div className="mt-8 text-xl font-medium text-theme-900">
              Interviews
            </div>
            <CardTable
              data={tableData}
              columns={columns}
              onRowClick={(row) => {
                setSelectedInterview(row.originalSession);
                setIsModalOpen(true);
                router.push(
                  `${pathname}?interviewSessionId=${row.originalSession.id}&modalOpen=true`,
                );
              }}
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
        />
      )}
    </>
  );
};

export default InterviewPageComponent;
