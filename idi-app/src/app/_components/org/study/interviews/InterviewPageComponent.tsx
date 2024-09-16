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

  const getStatusClass = (status: InterviewSessionStatus) => {
    switch (status) {
      case InterviewSessionStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case InterviewSessionStatus.IN_PROGRESS:
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
            <div className="flex flex-row items-center gap-4 px-4 py-1 font-medium text-theme-600">
              <div className="w-1/3">Id</div>
              <div className="flex flex-1 justify-end gap-4">
                <div className="w-1/4 text-right">Date Taken</div>
                <div className="w-1/4 text-right">Time Taken</div>
                <div className="w-1/4 text-right">Status</div>
              </div>
            </div>
            {interviewData.interviewSessions.map((session) => (
              <div
                key={session.id}
                className="flex cursor-pointer flex-row items-center gap-4 rounded-md border border-theme-200 px-4 py-3 hover:bg-theme-50"
                onClick={() => {
                  setSelectedInterview(session);
                  setIsModalOpen(true);
                }}
              >
                <div className="w-1/3 font-medium text-theme-900">
                  {session.id || "Anonymous Participant"}
                </div>
                <div className="flex flex-1 justify-end gap-4">
                  <div className="w-1/4 text-right text-theme-600">
                    {formatDate(session.startTime)}
                  </div>
                  <div className="w-1/4 text-right text-theme-600">
                    5:42 {/* TODO: Calculate actual time taken */}
                  </div>
                  <div className="w-1/4 text-right">
                    <span
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${getStatusClass(session.status)} inline-block`}
                    >
                      {session.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
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
