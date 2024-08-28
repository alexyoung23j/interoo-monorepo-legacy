"use client";

import React from "react";
import {
  FollowUpLevel,
  InterviewSession,
  InterviewSessionStatus,
  Organization,
  Question,
  QuestionType,
  Study,
} from "@shared/generated/client";
import Image from "next/image";
import { InterviewProgressBar } from "./InterviewProgressBar";
import { DisplayQuestion } from "./DisplayQuestion";
import InterviewBottomBar from "./InterviewBottomBar";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import ClipLoader from "react-spinners/ClipLoader";
import { InterviewStartContent } from "./setup/InterviewStartContent";

interface InterviewLayoutProps {
  study: Study & { questions: Question[] };
  organization: Organization;
  // interviewSession: InterviewSession;
  backgroundLight: boolean;
}

type MockQuestion = {
  id: string;
  title: string;
  context: string;
  shouldFollowUp: boolean;
  followUpLevel: FollowUpLevel;
  body: string;
  studyId: string;
  questionType: QuestionType;
  questionOrder: number;
  hasStimulus: boolean;
  imageStimuli?: {
    id: string;
    bucketUrl: string;
    title: string;
    altText: string;
  }[];
  videoStimuli?: { id: string; url: string; type: string; title: string }[];
  websiteStimuli?: { id: string; websiteUrl: string; title: string }[];
  allowMultipleSelections?: boolean;
  multipleChoiceOptions?: {
    id: string;
    optionText: string;
    optionOrder: number;
  }[];
  lowRange?: number;
  highRange?: number;
};

const mockData: { questions: MockQuestion[] } = {
  questions: [
    {
      id: "q1",
      title: "Open-ended question with image stimulus",
      context: "Please observe the image and answer the following question.",
      shouldFollowUp: true,
      followUpLevel: "AUTOMATIC",
      body: "What emotions does this image evoke in you?",
      studyId: "study1",
      questionType: "OPEN_ENDED",
      questionOrder: 1,
      hasStimulus: true,
      imageStimuli: [
        {
          id: "img1",
          bucketUrl: "https://placehold.co/700x500",
          title: "Serene Nature Scene",
          altText: "A peaceful lake surrounded by mountains",
        },
        // {
        //   id: "img2",
        //   bucketUrl: "https://placehold.co/600x500",
        //   title: "Serene Nature Scene this one ",
        //   altText: "A peaceful lake surrounded by mountains",
        // },
        // {
        //   id: "img2",
        //   bucketUrl: "https://placehold.co/1000x1000",
        //   title: "Serene Nature Scene",
        //   altText: "A peaceful lake surrounded by mountains",
        // },
        // {
        //   id: "img2",
        //   bucketUrl: "https://placehold.co/1000x1000",
        //   title: "Serene Nature Scene",
        //   altText: "A peaceful lake surrounded by mountains",
        // },
      ],
    },
    {
      id: "q2",
      title: "Question with video stimulus",
      context: "Watch the video and select the most appropriate answer.",
      shouldFollowUp: false,
      followUpLevel: "SURFACE",
      body: "Which of the following best describes the main theme of the video?",
      studyId: "study1",
      questionType: "OPEN_ENDED",
      questionOrder: 2,
      hasStimulus: true,
      videoStimuli: [
        // {
        //   id: "vid1",
        //   url: "https://www.taxmann.com/emailer/images/CompaniesAct.mp4",
        //   type: "UPLOADED",
        //   title: "Product Demo Video",
        // },
        {
          id: "vid12",
          url: "https://www.youtube.com/watch?v=uATrIgT1tsM",
          type: "EXTERNAL",
          title: "Product Demo Video",
        },
      ],
      allowMultipleSelections: false,

      // multipleChoiceOptions: [
      //   {
      //     id: "opt1",
      //     optionText: "Innovation",
      //     optionOrder: 1,
      //   },
      //   {
      //     id: "opt2",
      //     optionText: "Sustainability",
      //     optionOrder: 2,
      //   },
      //   {
      //     id: "opt3",
      //     optionText: "User Experience",
      //     optionOrder: 3,
      //   },
      // ],
    },
    {
      id: "q3",
      title: "Range question with website stimulus",
      context: "Explore the website and rate your experience.",
      shouldFollowUp: true,
      followUpLevel: "DEEP",
      body: "On a scale of 1 to 10, how likely are you to recommend this website to a friend?",
      studyId: "study1",
      questionType: "RANGE",
      questionOrder: 3,
      hasStimulus: true,
      websiteStimuli: [
        {
          id: "web1",
          websiteUrl: "https://example.com",
          title: "Example Website",
        },
        {
          id: "web1",
          websiteUrl: "https://example.com",
          title: "Example Website 2 much longer",
        },
      ],
      lowRange: 1,
      highRange: 10,
    },
    {
      id: "q4",
      title: "Multiple choice question with multiple selections",
      context: "Select all that apply.",
      shouldFollowUp: false,
      followUpLevel: "LIGHT",
      body: "Which of the following features would you like to see in our product?",
      studyId: "study1",
      questionType: "MULTIPLE_CHOICE",
      questionOrder: 4,
      hasStimulus: false,
      allowMultipleSelections: true,
      multipleChoiceOptions: [
        {
          id: "opt4",
          optionText: "Dark mode",
          optionOrder: 1,
        },
        {
          id: "opt5",
          optionText: "Voice commands",
          optionOrder: 2,
        },
        {
          id: "opt6",
          optionText: "Offline support",
          optionOrder: 3,
        },
        {
          id: "opt7",
          optionText: "Cloud synchronization",
          optionOrder: 4,
        },
        {
          id: "opt8",
          optionText: "Cloud synchronization",
          optionOrder: 4,
        },
        {
          id: "opt9",
          optionText: "Cloud synchronization",
          optionOrder: 4,
        },
        {
          id: "opt10",
          optionText: "Cloud synchronization",
          optionOrder: 4,
        },
        {
          id: "opt11",
          optionText: "Cloud synchronization",
          optionOrder: 4,
        },
      ],
    },
    {
      id: "q5",
      title: "Open-ended question without stimulus",
      context: "Please provide your honest opinion.",
      shouldFollowUp: true,
      followUpLevel: "AUTOMATIC",
      body: "What improvements would you suggest for our customer support process?",
      studyId: "study1",
      questionType: "OPEN_ENDED",
      questionOrder: 5,
      hasStimulus: false,
    },
    {
      id: "q6",
      title: "Range question",
      context: "Explore the website and rate your experience.",
      shouldFollowUp: true,
      followUpLevel: "DEEP",
      body: "On a scale of 1 to 10, how likely are you to recommend this website to a friend?",
      studyId: "study1",
      questionType: "RANGE",
      questionOrder: 3,
      hasStimulus: false,
      lowRange: 1,
      highRange: 5,
    },
  ],
};

export const InterviewLayout: React.FC<InterviewLayoutProps> = ({
  study,
  organization,
  backgroundLight,
}) => {
  const params = useParams();
  const interviewSessionId = params.interviewSessionId as string;

  // This is the state for the entire interview
  const {
    data: interviewSession,
    isLoading: interviewSessionLoading,
    refetch: refetchInterviewSession,
  } = api.interviews.getInterviewSession.useQuery({
    interviewSessionId,
  });

  console.log({ interviewSession });

  const currentQuestion = interviewSession?.CurrentQuestion;
  const isInInterview =
    currentQuestion !== null &&
    interviewSession?.status === InterviewSessionStatus.IN_PROGRESS;

  console.log({ isInInterview });

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
        <Image
          src={organization.logoUrl!}
          alt=""
          width={150}
          height={150}
          className="max-h-[100px] max-w-[100px] object-contain"
          unoptimized
        />
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
        {interviewSessionLoading ? (
          <div className="flex h-full items-center justify-center">
            <ClipLoader
              color={organization.secondaryColor as string}
              size={40}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : (
          <>
            <div className="flex w-full md:p-8">
              <InterviewProgressBar
                interviewSession={interviewSession as InterviewSession}
                study={study}
                onNext={() => {
                  console.log("chill");
                }}
                onBack={() => {
                  console.log("chill");
                }}
              />
            </div>
            {isInInterview ? (
              <DisplayQuestion
                question={currentQuestion as Question}
                interviewSession={interviewSession as InterviewSession}
                organization={organization}
              />
            ) : (
              <InterviewStartContent
                interviewSession={interviewSession as InterviewSession}
                organization={organization}
                study={study}
                refetchInterviewSession={refetchInterviewSession}
              />
            )}
            {isInInterview ? (
              <InterviewBottomBar organization={organization} />
            ) : (
              <div className="h-20"></div>
            )}
          </>
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
