import React from "react";
import Image from "next/image";
import { Organization } from "@shared/generated/client";
import ClipLoader from "react-spinners/ClipLoader";

interface InterviewScreenLayoutProps {
  organization: Organization;
  backgroundLight: boolean;
  isLoading: boolean;
  children: React.ReactNode;
}

export const InterviewScreenLayout: React.FC<InterviewScreenLayoutProps> = ({
  organization,
  backgroundLight,
  isLoading,
  children,
}) => {
  return (
    <div
      className="relative flex h-screen flex-col bg-org-primary px-4 pb-8 pt-16 md:px-32 md:py-24"
      style={
        {
          "--org-primary-color": organization.primaryColor,
          "--org-secondary-color": organization.secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <div className="flex items-center">
          {organization.logoUrl && (
            <Image
              src={organization.logoUrl}
              alt=""
              width={150}
              height={150}
              className="max-h-[100px] max-w-[100px] object-contain"
              unoptimized
            />
          )}
        </div>
        <div
          className={`cursor-pointer text-center text-sm font-medium opacity-30 md:hidden ${
            backgroundLight ? "text-black" : "text-white"
          }`}
          onClick={() => {
            // TODO: redirect to home page
          }}
        >
          Powered by Interoo
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center overflow-y-auto rounded-[4px] border-2 border-org-secondary bg-off-white p-4 md:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <ClipLoader
              color={organization.secondaryColor ?? "grey"}
              size={40}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {children}
          </div>
        )}
      </div>
      <div
        className={`absolute bottom-10 left-0 right-0 hidden cursor-pointer text-center text-sm font-medium opacity-30 md:block ${
          backgroundLight ? "text-black" : "text-white"
        }`}
        onClick={() => {
          // TODO: redirect to home page
        }}
      >
        Powered by Interoo
      </div>
    </div>
  );
};
