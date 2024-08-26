"use client";

import React, { ReactNode } from "react";
import {
  InterviewSession,
  Organization,
  Study,
} from "@shared/generated/client";
import Image from "next/image";

import { cx } from "@/tailwind/styling";

interface InterviewLayoutProps {
  study: Study;
  organization: Organization;
  interviewSession: InterviewSession;
  backgroundLight: boolean;
}

export const InterviewLayout: React.FC<InterviewLayoutProps> = ({
  study,
  organization,
  interviewSession,
  backgroundLight,
}) => {
  return (
    <div
      className="bg-org-primary relative flex h-screen items-center justify-center px-4 pb-6 pt-16 md:px-32 md:py-24"
      style={
        {
          "--org-primary-color": organization.primaryColor,
          "--org-secondary-color": organization.secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="absolute top-4 flex w-full items-center justify-between px-4">
        <Image
          src={organization.logoUrl as string}
          alt=""
          width={150}
          height={150}
          className="max-h-[100px] max-w-[100px] object-contain"
          unoptimized
        />
        <div
          className={`block cursor-pointer text-center text-sm font-medium md:hidden ${
            backgroundLight ? "text-black opacity-30" : "text-white"
          }`}
          onClick={() => {
            // TODO: redirect to home page
          }}
        >
          Powered by ResearchEcho
        </div>
      </div>

      <div className="border-org-secondary bg-off-white h-full w-full max-w-[1200px] rounded-sm border"></div>
      <div
        className={`absolute bottom-10 left-0 right-0 hidden cursor-pointer text-center text-sm font-medium md:block ${
          backgroundLight ? "text-black opacity-30" : "text-white"
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
