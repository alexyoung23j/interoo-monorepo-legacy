"use client";

import SimpleLayout from "@/app/_components/layouts/SimpleLayout";
import { useParams, useSearchParams } from "next/navigation";

const MissingOrgErrorPage = () => {
  return (
    <SimpleLayout showLogo={true}>
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-theme-600 mb-4 text-2xl">Something went wrong!</h1>
        <div className="bg-theme-off-white border-theme-400 shadow-standard flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-sm border p-4 md:w-[600px] md:p-6">
          <h2 className="text-md font-medium text-red-500 md:text-xl">
            You are not a member of any organization. Please contact your
            administrator.
          </h2>
        </div>
      </div>
    </SimpleLayout>
  );
};

export default MissingOrgErrorPage;
