-- DropForeignKey
ALTER TABLE "Attribute" DROP CONSTRAINT "Attribute_studyId_fkey";

-- DropForeignKey
ALTER TABLE "AttributesOnQuestion" DROP CONSTRAINT "AttributesOnQuestion_attributeId_fkey";

-- DropForeignKey
ALTER TABLE "AttributesOnQuestion" DROP CONSTRAINT "AttributesOnQuestion_questionId_fkey";

-- DropForeignKey
ALTER TABLE "DemographicQuestionConfiguration" DROP CONSTRAINT "DemographicQuestionConfiguration_studyId_fkey";

-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_studyId_fkey";

-- DropForeignKey
ALTER TABLE "FollowUpQuestion" DROP CONSTRAINT "FollowUpQuestion_parentQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewParticipant" DROP CONSTRAINT "InterviewParticipant_interviewSessionId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewSession" DROP CONSTRAINT "InterviewSession_studyId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_studyId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionAttributeAnalysisJob" DROP CONSTRAINT "QuestionAttributeAnalysisJob_interviewSessionId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionAttributeAnalysisJob" DROP CONSTRAINT "QuestionAttributeAnalysisJob_questionId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionAttributeAnalysisJob" DROP CONSTRAINT "QuestionAttributeAnalysisJob_studyId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionThemeAnalysisJob" DROP CONSTRAINT "QuestionThemeAnalysisJob_interviewSessionId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionThemeAnalysisJob" DROP CONSTRAINT "QuestionThemeAnalysisJob_questionId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionThemeAnalysisJob" DROP CONSTRAINT "QuestionThemeAnalysisJob_studyId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_responseId_fkey";

-- DropForeignKey
ALTER TABLE "QuotesOnAttribute" DROP CONSTRAINT "QuotesOnAttribute_attributeId_fkey";

-- DropForeignKey
ALTER TABLE "QuotesOnAttribute" DROP CONSTRAINT "QuotesOnAttribute_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "QuotesOnTheme" DROP CONSTRAINT "QuotesOnTheme_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "QuotesOnTheme" DROP CONSTRAINT "QuotesOnTheme_themeId_fkey";

-- DropForeignKey
ALTER TABLE "Response" DROP CONSTRAINT "Response_followUpQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "Response" DROP CONSTRAINT "Response_interviewSessionId_fkey";

-- DropForeignKey
ALTER TABLE "Response" DROP CONSTRAINT "Response_questionId_fkey";

-- DropForeignKey
ALTER TABLE "ResponseMedia" DROP CONSTRAINT "ResponseMedia_responseId_fkey";

-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_studyId_fkey";

-- DropForeignKey
ALTER TABLE "ThemesOnQuestion" DROP CONSTRAINT "ThemesOnQuestion_questionId_fkey";

-- DropForeignKey
ALTER TABLE "ThemesOnQuestion" DROP CONSTRAINT "ThemesOnQuestion_themeId_fkey";

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpQuestion" ADD CONSTRAINT "FollowUpQuestion_parentQuestionId_fkey" FOREIGN KEY ("parentQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_followUpQuestionId_fkey" FOREIGN KEY ("followUpQuestionId") REFERENCES "FollowUpQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseMedia" ADD CONSTRAINT "ResponseMedia_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionThemeAnalysisJob" ADD CONSTRAINT "QuestionThemeAnalysisJob_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionThemeAnalysisJob" ADD CONSTRAINT "QuestionThemeAnalysisJob_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionThemeAnalysisJob" ADD CONSTRAINT "QuestionThemeAnalysisJob_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttributeAnalysisJob" ADD CONSTRAINT "QuestionAttributeAnalysisJob_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttributeAnalysisJob" ADD CONSTRAINT "QuestionAttributeAnalysisJob_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttributeAnalysisJob" ADD CONSTRAINT "QuestionAttributeAnalysisJob_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotesOnTheme" ADD CONSTRAINT "QuotesOnTheme_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotesOnTheme" ADD CONSTRAINT "QuotesOnTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemesOnQuestion" ADD CONSTRAINT "ThemesOnQuestion_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemesOnQuestion" ADD CONSTRAINT "ThemesOnQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotesOnAttribute" ADD CONSTRAINT "QuotesOnAttribute_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotesOnAttribute" ADD CONSTRAINT "QuotesOnAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributesOnQuestion" ADD CONSTRAINT "AttributesOnQuestion_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributesOnQuestion" ADD CONSTRAINT "AttributesOnQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemographicQuestionConfiguration" ADD CONSTRAINT "DemographicQuestionConfiguration_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
