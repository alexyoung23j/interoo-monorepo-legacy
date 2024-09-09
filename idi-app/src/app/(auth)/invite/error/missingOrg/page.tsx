"use client";

import SimpleLayout from "@/app/_components/layouts/SimpleLayout";
import { useParams, useSearchParams } from "next/navigation";

const MissingOrgErrorPage = () => {
  return (
    <SimpleLayout showLogo={true}>
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="mb-4 text-2xl text-theme-600">Something went wrong!</h1>
        <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-sm border border-theme-400 bg-theme-off-white p-4 shadow-standard md:w-[600px] md:p-6">
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
