-- DropForeignKey
ALTER TABLE "BoostedKeyword" DROP CONSTRAINT "BoostedKeyword_studyId_fkey";

-- AddForeignKey
ALTER TABLE "BoostedKeyword" ADD CONSTRAINT "BoostedKeyword_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
