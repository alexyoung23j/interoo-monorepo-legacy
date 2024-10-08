import { ResponseModalCard } from "@/app/_components/reusable/ResponseModalCard";
import { api } from "@/trpc/react";
import { CaretUpDown, Star } from "@phosphor-icons/react";
import type { ExtendedResponse } from "@shared/types";
import { useRouter, usePathname, useParams } from "next/navigation";
import React from "react";
import { ClipLoader } from "react-spinners";

const DisplayFavoriteResponses: React.FC<{ studyId: string }> = ({
  studyId,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { orgId } = useParams<{ orgId: string }>();

  const {
    data: favoriteResponses,
    isLoading,
    refetch,
  } = api.favorites.getFavoriteResponses.useQuery(
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

  return (
    <div className="mt-2 flex w-full flex-col gap-1">
      {favoriteResponses?.length === 0 ? (
        <div className="flex h-full w-full items-center text-sm text-theme-600">
          <span className="whitespace-nowrap">
            No favorited responses. Click the{" "}
          </span>
          <span className="mx-1 flex items-center text-theme-900">
            <Star size={16} />
          </span>
          <span className="whitespace-nowrap">
            {" "}
            icon on a response to add it to your favorites.
          </span>
        </div>
      ) : (
        <div className="flex w-full items-center justify-between px-2">
          <div className="text-xs font-medium text-theme-600">Responses</div>
          <div className="mb-2 ml-2 flex items-center gap-1 text-xs font-medium text-theme-600">
            Date Added <CaretUpDown size={12} className="text-theme-600" />
          </div>
        </div>
      )}

      <div className="flex w-full flex-col gap-3">
        {favoriteResponses?.map((favoriteResponse) => (
          <ResponseModalCard
            key={favoriteResponse.id}
            response={favoriteResponse.response as ExtendedResponse}
            currentResponseId={""}
            onResponseClicked={() => {
              router.push(
                `/org/${orgId}/study/${studyId}/results?questionId=${favoriteResponse.response?.questionId}&interviewSessionId=${favoriteResponse.response?.interviewSessionId}&responseId=${favoriteResponse.response?.id}&modalOpen=true`,
              );
            }}
            copyIndividualResponse={() => {
              //noop
            }}
            refetchResponses={refetch}
            showFollowUpAndTime={false}
            showCopyButton={false}
            largeQuestionFont={false}
          />
        ))}
      </div>
    </div>
  );
};

export default DisplayFavoriteResponses;
