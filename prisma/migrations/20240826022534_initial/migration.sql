/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Test` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TestTwo` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ENGLISH');

-- CreateEnum
CREATE TYPE "VideoStimulusType" AS ENUM ('UPLOADED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "FollowUpLevel" AS ENUM ('AUTOMATIC', 'SURFACE', 'LIGHT', 'DEEP');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('OPEN_ENDED', 'MULTIPLE_CHOICE', 'RANGE');

-- CreateEnum
CREATE TYPE "InterviewSessionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- DropTable
DROP TABLE "Post";

-- DropTable
DROP TABLE "Test";

-- DropTable
DROP TABLE "TestTwo";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supabaseUserID" TEXT NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetLength" INTEGER,
    "welcomeDescription" TEXT,
    "termsAndConditions" TEXT,
    "welcomeImageUrl" TEXT,
    "studyBackground" TEXT,
    "videoEnabled" BOOLEAN DEFAULT false,
    "maxResponses" INTEGER,
    "status" "StudyStatus" NOT NULL,
    "shortID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportingLanguage" "Language" NOT NULL,
    "languages" "Language"[],

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageStimulus" (
    "id" TEXT NOT NULL,
    "bucketUrl" TEXT NOT NULL,
    "title" TEXT,
    "altText" TEXT,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "ImageStimulus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoStimulus" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "VideoStimulusType" NOT NULL,
    "title" TEXT,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "VideoStimulus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteStimulus" (
    "id" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "title" TEXT,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "WebsiteStimulus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT,
    "shouldFollowUp" BOOLEAN NOT NULL,
    "followUpLevel" "FollowUpLevel" NOT NULL DEFAULT 'AUTOMATIC',
    "body" TEXT,
    "studyId" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "questionOrder" INTEGER NOT NULL,
    "hasStimulus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allowMultipleSelections" BOOLEAN NOT NULL DEFAULT false,
    "lowRange" INTEGER,
    "highRange" INTEGER,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "fastTranscribedText" TEXT NOT NULL,
    "rangeSelection" INTEGER,
    "interviewSessionId" TEXT NOT NULL,
    "multipleChoiceOptionId" TEXT,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseMedia" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "audioBucketUrl" TEXT NOT NULL,
    "videoBucketUrl" TEXT,
    "transcribedText" TEXT,

    CONSTRAINT "ResponseMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MultipleChoiceOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "optionOrder" INTEGER NOT NULL,

    CONSTRAINT "MultipleChoiceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "lastUpdatedTime" TIMESTAMP(3),
    "status" "InterviewSessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "latestQuestionRespondedId" TEXT,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Study_shortID_key" ON "Study"("shortID");

-- CreateIndex
CREATE UNIQUE INDEX "ImageStimulus_bucketUrl_key" ON "ImageStimulus"("bucketUrl");

-- CreateIndex
CREATE UNIQUE INDEX "VideoStimulus_url_key" ON "VideoStimulus"("url");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteStimulus_websiteUrl_key" ON "WebsiteStimulus"("websiteUrl");

-- CreateIndex
CREATE UNIQUE INDEX "ResponseMedia_responseId_key" ON "ResponseMedia"("responseId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageStimulus" ADD CONSTRAINT "ImageStimulus_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoStimulus" ADD CONSTRAINT "VideoStimulus_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteStimulus" ADD CONSTRAINT "WebsiteStimulus_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_multipleChoiceOptionId_fkey" FOREIGN KEY ("multipleChoiceOptionId") REFERENCES "MultipleChoiceOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseMedia" ADD CONSTRAINT "ResponseMedia_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultipleChoiceOption" ADD CONSTRAINT "MultipleChoiceOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_latestQuestionRespondedId_fkey" FOREIGN KEY ("latestQuestionRespondedId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
