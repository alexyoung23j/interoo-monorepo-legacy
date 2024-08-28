import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { FollowUpQuestion, Question } from "@shared/generated/client";

export const interviewsRouter = createTRPCRouter({
  createInterviewSession: publicProcedure
    .input(z.object({ shortenedStudyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { shortenedStudyId } = input;

      const study = await ctx.db.study.findUnique({
        where: {
          shortID: shortenedStudyId,
        },
      });

      if (!study) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Study not found",
        });
      }

      const interviewSession = await ctx.db.interviewSession.create({
        data: {
          studyId: study.id,
          startTime: new Date(),
        },
      });

      return interviewSession;
    }),
  getInterviewSession: publicProcedure
    .input(z.object({ interviewSessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { interviewSessionId } = input;

      const interviewSession = await ctx.db.interviewSession.findUnique({
        where: {
          id: interviewSessionId,
        },
        include: {
          CurrentQuestion: {
            include: {
              imageStimuli: true,
              videoStimuli: true,
              websiteStimuli: true,
              multipleChoiceOptions: true,
            },
          },
          FollowUpQuestions: {
            orderBy: {
              followUpQuestionOrder: "desc",
            },
          },
          study: {
            include: {
              questions: {
                orderBy: {
                  questionOrder: "asc",
                },
              },
            },
          },
        },
      });

      if (!interviewSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview session not found",
        });
      }

      // Calculate the current question
      let calculatedCurrentQuestion: Question | FollowUpQuestion | null = null;

      if (interviewSession.CurrentQuestion) {
        const latestFollowUp = interviewSession.FollowUpQuestions.find(
          (fq) => fq.parentQuestionId === interviewSession.CurrentQuestion?.id,
        );

        calculatedCurrentQuestion =
          latestFollowUp || interviewSession.CurrentQuestion;
      }

      // Return the interview session with the calculated current question
      return {
        interviewSession,
        calculatedCurrentQuestion,
      };
    }),
  mutateInterviewSession: publicProcedure
    .input(
      z.object({
        interviewSessionId: z.string(),
        startTime: z.date().optional(),
        lastUpdatedTime: z.date().optional(),
        status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
        currentQuestionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { interviewSessionId, ...updateData } = input;

      const interviewSession = await ctx.db.interviewSession.update({
        where: {
          id: interviewSessionId,
        },
        data: updateData,
      });

      return interviewSession;
    }),
  startInterviewSessionQuestions: publicProcedure
    .input(z.object({ interviewSessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { interviewSessionId } = input;

      // Find the interview session
      const interviewSession = await ctx.db.interviewSession.findUnique({
        where: { id: interviewSessionId },
        include: { study: true },
      });

      if (!interviewSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview session not found",
        });
      }

      // Find the first question (questionOrder = 0) for the associated study
      const firstQuestion = await ctx.db.question.findFirst({
        where: {
          studyId: interviewSession.study.id,
          questionOrder: 0,
        },
      });

      if (!firstQuestion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No questions found for this study",
        });
      }

      // Update the interview session with the first question
      const updatedInterviewSession = await ctx.db.interviewSession.update({
        where: { id: interviewSessionId },
        data: {
          currentQuestionId: firstQuestion.id,
          status: "IN_PROGRESS",
          lastUpdatedTime: new Date(),
        },
      });

      return updatedInterviewSession;
    }),
});
