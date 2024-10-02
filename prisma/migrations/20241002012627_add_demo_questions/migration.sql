/*
  Warnings:

  - You are about to drop the column `email` on the `InterviewParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `InterviewParticipant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InterviewParticipant" DROP COLUMN "email",
DROP COLUMN "name";

-- CreateTable
CREATE TABLE "DemographicQuestionConfiguration" (
    "id" TEXT NOT NULL,
    "name" BOOLEAN NOT NULL DEFAULT false,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumber" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studyId" TEXT NOT NULL,

    CONSTRAINT "DemographicQuestionConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemographicResponse" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "interviewParticipantId" TEXT NOT NULL,

    CONSTRAINT "DemographicResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemographicQuestionConfiguration_studyId_key" ON "DemographicQuestionConfiguration"("studyId");

-- CreateIndex
CREATE UNIQUE INDEX "DemographicResponse_interviewParticipantId_key" ON "DemographicResponse"("interviewParticipantId");

-- AddForeignKey
ALTER TABLE "DemographicQuestionConfiguration" ADD CONSTRAINT "DemographicQuestionConfiguration_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemographicResponse" ADD CONSTRAINT "DemographicResponse_interviewParticipantId_fkey" FOREIGN KEY ("interviewParticipantId") REFERENCES "InterviewParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
