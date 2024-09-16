"use client";

import React, { useState } from "react";
import {
  InterviewSession,
  InterviewSessionStatus,
} from "@shared/generated/client";
import SplitScreenLayout from "@/app/_components/layouts/org/SplitScreenLayout";
import BasicHeaderCard from "@/app/_components/reusable/BasicHeaderCard";
import { Button } from "@/components/ui/button";
import { ArrowSquareOut } from "@phosphor-icons/react";
import InterviewSessionModal from "./InterviewSessionModal";
import BasicTag from "@/app/_components/reusable/BasicTag";
import CardTable from "@/app/_components/reusable/CardTable";

interface InterviewPageComponentProps {
  interviewData: {
    interviewSessions: InterviewSession[];
    completedInterviewsCount: number;
    inProgressInterviewsCount: number;
  };
  studyId: string;
  orgId: string;
}

const InterviewPageComponent: React.FC<InterviewPageComponentProps> = ({
  interviewData,
  studyId,
  orgId,
}) => {
  const [selectedInterview, setSelectedInterview] =
    useState<InterviewSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        return { color: "bg-green-100", borderColor: "border-green-400" };
      case InterviewSessionStatus.IN_PROGRESS:
        return { color: "bg-yellow-100", borderColor: "border-yellow-400" };
      case InterviewSessionStatus.NOT_STARTED:
        return { color: "bg-theme-100", borderColor: "border-theme-300" };
      default:
        return { color: "bg-theme-100", borderColor: "border-theme-300" };
    }
  };

  const columns = [
    { key: "id", header: "Id", width: "33%" },
    {
      key: "dateTaken",
      header: "Date Taken",
      width: "22%",
      className: "justify-end",
    },
    {
      key: "timeTaken",
      header: "Time Taken",
      width: "22%",
      className: "justify-end",
    },
    { key: "status", header: "Status", width: "23%", className: "justify-end" },
  ];

  const tableData = interviewData.interviewSessions.map((session) => ({
    id: session.id || "Anonymous Participant",
    dateTaken: formatDate(session.startTime),
    timeTaken: "5:42", // TODO: Calculate actual time taken
    status: (
      <BasicTag {...getStatusProps(session.status)} fixedWidth={false}>
        {session.status.toLowerCase()}
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
                  title: "5:32", // TODO: Calculate actual average completion time
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
