import React from "react";
import Image from "next/image";
import { Organization } from "@shared/generated/client";
import ClipLoader from "react-spinners/ClipLoader";
import { Button } from "@/components/ui/button";
import { Pause } from "@phosphor-icons/react";
import { isColorLight } from "@/app/utils/color";

interface InterviewScreenLayoutProps {
  organization: Organization;
  backgroundLight: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  onPause?: () => void;
  isInProgress?: boolean;
}

export const InterviewScreenLayout: React.FC<InterviewScreenLayoutProps> = ({
  organization,
  backgroundLight,
  isLoading,
  children,
  onPause,
  isInProgress = false,
}) => {
  return (
    <div
      className="relative flex h-dvh flex-col bg-org-primary px-4 pb-2 pt-16 md:px-32 md:py-20"
      style={
        {
          "--org-primary-color": organization.primaryColor,
          "--org-secondary-color": organization.secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <div className="flex items-center justify-center">
          {organization.logoUrl ? (
            <Image
              src={organization.logoUrl}
              alt=""
              width={150}
              height={150}
              className="max-h-[100px] max-w-[100px] object-contain"
              unoptimized
            />
          ) : (
            <Image
              src="/logo_v1.png"
              alt=""
              width={100}
              height={100}
              className="mt-2 max-h-[20px] max-w-[100px] object-contain md:mt-4"
              unoptimized
            />
          )}
        </div>
        {organization.logoUrl && (
          <div
            className={`cursor-pointer text-center text-sm font-medium opacity-30 md:hidden ${
              backgroundLight ? "text-black" : "text-white"
            }`}
            onClick={() => {
              window.open("https://interoo.ai", "_blank");
            }}
          >
            Powered by Interoo
          </div>
        )}
      </div>

      {isInProgress && (
        <div className="absolute right-6 top-6 flex items-center gap-2">
          <div className="hidden text-xs font-medium text-theme-900 md:flex">
            Pause
          </div>
          <Button
            variant="unstyled"
            className="h-6 rounded-md bg-org-secondary !px-2"
            onClick={onPause}
          >
            <Pause
              color={
                isColorLight(organization.secondaryColor ?? "")
                  ? "black"
                  : "white"
              }
              size={12}
            />
          </Button>
        </div>
      )}

      <div className="flex w-full flex-1 items-center justify-center overflow-y-auto rounded-[4px] border-2 border-org-secondary bg-off-white md:px-4 md:py-4">
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
        className={`absolute bottom-8 left-0 right-0 hidden cursor-pointer text-center text-sm font-medium opacity-30 md:block ${
          backgroundLight ? "text-black" : "text-white"
        }`}
        onClick={() => {
          window.open("https://interoo.ai", "_blank");
        }}
      >
        Powered by Interoo
      </div>
    </div>
  );
};
