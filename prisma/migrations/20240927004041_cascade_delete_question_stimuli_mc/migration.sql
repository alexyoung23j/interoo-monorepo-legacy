-- DropForeignKey
ALTER TABLE "ImageStimulus" DROP CONSTRAINT "ImageStimulus_questionId_fkey";

-- DropForeignKey
ALTER TABLE "MultipleChoiceOption" DROP CONSTRAINT "MultipleChoiceOption_questionId_fkey";

-- DropForeignKey
ALTER TABLE "VideoStimulus" DROP CONSTRAINT "VideoStimulus_questionId_fkey";

-- DropForeignKey
ALTER TABLE "WebsiteStimulus" DROP CONSTRAINT "WebsiteStimulus_questionId_fkey";

-- AddForeignKey
ALTER TABLE "ImageStimulus" ADD CONSTRAINT "ImageStimulus_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoStimulus" ADD CONSTRAINT "VideoStimulus_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteStimulus" ADD CONSTRAINT "WebsiteStimulus_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultipleChoiceOption" ADD CONSTRAINT "MultipleChoiceOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
