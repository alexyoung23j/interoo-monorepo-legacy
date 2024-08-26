"use client";

import React, { ReactNode } from "react";
import { Organization, Study } from "../../../../../shared/generated/client";

interface InterviewLayoutProps {
  study: Study;
  organization: Organization;
}

export const InterviewPage: React.FC<InterviewLayoutProps> = ({
  study,
  organization,
}) => {
  return (
    <div
      className="h-screen"
      style={{ backgroundColor: organization.primaryColor as string }}
    >
      test
    </div>
  );
};
