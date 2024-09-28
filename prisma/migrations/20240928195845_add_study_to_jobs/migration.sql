/*
  Warnings:

  - Added the required column `studyId` to the `QuestionAttributeAnalysisJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studyId` to the `QuestionThemeAnalysisJob` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuestionAttributeAnalysisJob" ADD COLUMN     "studyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuestionThemeAnalysisJob" ADD COLUMN     "studyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "QuestionThemeAnalysisJob" ADD CONSTRAINT "QuestionThemeAnalysisJob_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttributeAnalysisJob" ADD CONSTRAINT "QuestionAttributeAnalysisJob_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
