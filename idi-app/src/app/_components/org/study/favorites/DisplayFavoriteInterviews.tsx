import { ResponseModalCard } from "@/app/_components/reusable/ResponseModalCard";
import { api } from "@/trpc/react";
import { CaretUpDown, Star } from "@phosphor-icons/react";
import type { ExtendedResponse, PauseInterval } from "@shared/types";
import {
  useRouter,
  usePathname,
  useParams,
  useSearchParams,
} from "next/navigation";
import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import CardTable from "@/app/_components/reusable/CardTable";
import BasicTag from "@/app/_components/reusable/BasicTag";
import {
  InterviewSessionStatus,
  InterviewSession,
  Study,
  Response,
  Favorite,
} from "@shared/generated/client";
import { formatElapsedTime } from "@/app/utils/functions";
import InterviewSessionModal from "../interviews/InterviewSessionModal";

const DisplayFavoriteInterviews: React.FC<{ studyId: string }> = ({
  studyId,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { orgId } = useParams<{ orgId: string }>();
  const searchParams = useSearchParams();

  const [selectedInterview, setSelectedInterview] = useState<
    | (InterviewSession & {
        study: Study;
        responses: Response[];
        Favorites: Favorite[];
      })
    | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    data: favoriteInterviews,
    isLoading,
    refetch,
  } = api.favorites.getFavoriteInterviewSessions.useQuery(
    {
      studyId,
    },
    {
      refetchOnWindowFocus: true,
    },
  );

  if (isLoading) {
    return (
      <div className="flex h-full grow items-center justify-center">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );
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

  const columns = [
    { key: "respondent", header: "Respondent", width: "75%" },
    {
      key: "dateTaken",
      header: "Date Started",
      className: "justify-end",
    },
    { key: "status", header: "Status", className: "justify-end" },
  ];

  const tableData = favoriteInterviews?.map((session) => ({
    respondent:
      session.interviewSession?.participant?.demographicResponse?.name ??
      "Anonymous",
    dateTaken: (
      <div className="text-xs font-light text-theme-600">
        {formatDate(session.interviewSession?.startTime ?? null)}
      </div>
    ),
    status: (
      <BasicTag
        {...getStatusProps(
          session.interviewSession?.status ??
            InterviewSessionStatus.IN_PROGRESS,
        )}
        fixedWidth={false}
      >
        {session.interviewSession?.status === InterviewSessionStatus.COMPLETED
          ? "Completed"
          : "In Progress"}
      </BasicTag>
    ),
    originalSession: session,
  }));

  return (
    <div className="mt-2 flex w-full flex-col gap-1">
      {favoriteInterviews?.length === 0 ? (
        <div className="flex h-full w-full items-center text-sm text-theme-600">
          <span className="whitespace-nowrap">
            No favorited interviews. Click the{" "}
          </span>
          <span className="mx-1 flex items-center text-theme-900">
            <Star size={16} />
          </span>
          <span className="whitespace-nowrap">
            {" "}
            button on an interview to add it to your favorites.
          </span>
        </div>
      ) : (
        <>
          <div className="flex w-full items-center justify-between px-2">
            <div className="text-xs font-medium text-theme-600">Interviews</div>
            <div className="mb-2 ml-2 flex items-center gap-1 text-xs font-medium text-theme-600">
              Date Added <CaretUpDown size={12} className="text-theme-600" />
            </div>
          </div>
          <CardTable
            showHeader={false}
            data={tableData ?? []}
            columns={columns}
            onRowClick={(row) => {
              router.push(
                `/org/${orgId}/study/${studyId}/interviews?interviewSessionId=${row.originalSession?.interviewSession?.id}&modalOpen=true`,
              );
            }}
          />
        </>
      )}
    </div>
  );
};

export default DisplayFavoriteInterviews;
