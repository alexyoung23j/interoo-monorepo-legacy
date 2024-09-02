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
      className="relative flex h-screen items-center justify-center bg-org-primary px-4 pb-4 pt-16 md:px-32 md:py-24"
      style={
        {
          "--org-primary-color": organization.primaryColor,
          "--org-secondary-color": organization.secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="absolute top-4 flex w-full items-center justify-between px-4">
        {organization.logoUrl && (
          <Image
            src={organization.logoUrl!}
            alt=""
            width={150}
            height={150}
            className="max-h-[100px] max-w-[100px] object-contain"
            unoptimized
          />
        )}
        <div
          className={`block cursor-pointer text-center text-sm font-medium opacity-30 md:hidden ${
            backgroundLight ? "text-black" : "text-white"
          }`}
          onClick={() => {
            // TODO: redirect to home page
          }}
        >
          Powered by ResearchEcho
        </div>
      </div>

      <div className="flex h-full w-full max-w-[1200px] flex-col items-center justify-between rounded-[2px] border-2 border-org-secondary bg-off-white">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <ClipLoader
              color={organization.secondaryColor!}
              size={40}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : (
          children
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
        Powered by ResearchEcho
      </div>
    </div>
  );
};
