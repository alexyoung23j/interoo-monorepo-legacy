import express from 'express';
import { prisma } from '../index';
import { JobStatus, InterviewSessionStatus } from '@shared/generated/client';

const router = express.Router();

router.post('/', async (req, res) => {
  const { studyId } = req.body;

  if (!studyId) {
    return res.status(400).json({ error: 'Study ID is required' });
  }

  try {
    // Start a transaction
    await prisma.$transaction(async (tx) => {
      // First, find all Quotes associated with Themes in this study
      const quotesToDelete = await tx.quotesOnTheme.findMany({
        where: {
          theme: {
            studyId: studyId
          }
        },
        select: {
          quoteId: true
        }
      });

      // Delete these Quotes
      await tx.quote.deleteMany({
        where: {
          id: {
            in: quotesToDelete.map(q => q.quoteId)
          }
        }
      });

      // Delete all themes for the study (this will cascade delete QuotesOnTheme)
      await tx.theme.deleteMany({
        where: {
          studyId: studyId
        }
      });

      // Delete existing QuestionThemeAnalysisJobs for the study
      await tx.questionThemeAnalysisJob.deleteMany({
        where: {
          studyId: studyId
        }
      });

      // Fetch all completed interview sessions for the study
      const completedSessions = await tx.interviewSession.findMany({
        where: {
          studyId: studyId,
          status: InterviewSessionStatus.COMPLETED
        },
        select: {
          id: true
        }
      });

      // Fetch all questions for the study
      const questions = await tx.question.findMany({
        where: {
          studyId: studyId
        },
        select: {
          id: true
        }
      });

      // Create new QuestionThemeAnalysisJobs
      const newJobs = completedSessions.flatMap(session => 
        questions.map(question => ({
          studyId: studyId,
          questionId: question.id,
          interviewSessionId: session.id,
          status: JobStatus.NOT_STARTED
        }))
      );

      await tx.questionThemeAnalysisJob.createMany({
        data: newJobs
      });
    });

    res.status(200).json({ message: 'Study themes and associated quotes reset successfully' });
  } catch (error) {
    console.error('Error resetting study themes and quotes:', error);
    res.status(500).json({ error: 'An error occurred while resetting study themes and quotes' });
  }
});

export const resetStudyThemesRoute = router;
