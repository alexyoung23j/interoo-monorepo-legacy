/*
  Warnings:

  - You are about to drop the column `latestQuestionRespondedId` on the `InterviewSession` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "InterviewSession" DROP CONSTRAINT "InterviewSession_latestQuestionRespondedId_fkey";

-- AlterTable
ALTER TABLE "InterviewSession" DROP COLUMN "latestQuestionRespondedId",
ADD COLUMN     "currentQuestionId" TEXT;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "followUpQuestionId" TEXT;

-- CreateTable
CREATE TABLE "FollowUpQuestion" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "followUpQuestionOrder" INTEGER NOT NULL,
    "parentQuestionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "interviewSessionId" TEXT NOT NULL,

    CONSTRAINT "FollowUpQuestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FollowUpQuestion" ADD CONSTRAINT "FollowUpQuestion_parentQuestionId_fkey" FOREIGN KEY ("parentQuestionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpQuestion" ADD CONSTRAINT "FollowUpQuestion_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_followUpQuestionId_fkey" FOREIGN KEY ("followUpQuestionId") REFERENCES "FollowUpQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_currentQuestionId_fkey" FOREIGN KEY ("currentQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
