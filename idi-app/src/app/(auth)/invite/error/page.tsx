"use client";

import SimpleLayout from "@/app/_components/layouts/SimpleLayout";
import { useParams, useSearchParams } from "next/navigation";

const InviteErrorPage = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessage = () => {
    if (error === "invite-invalid") {
      return "This invite link is no longer valid";
    } else if (error === "user-already-has-profile") {
      return "You already have a profile. Please log in.";
    }
    // TODO: comprehensively handle all possible errors
    return "Unknown error";
  };

  return (
    <SimpleLayout showLogo={true}>
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-theme-600 mb-4 text-2xl">Something went wrong!</h1>
        <div className="bg-theme-off-white border-theme-400 shadow-standard flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-sm border p-4 md:w-[600px] md:p-6">
          <h2 className="text-md font-medium text-red-500 md:text-xl">
            {errorMessage()}
          </h2>
        </div>
      </div>
    </SimpleLayout>
  );
};

export default InviteErrorPage;
