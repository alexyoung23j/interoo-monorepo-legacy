import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { FollowUpQuestion, Question } from "@shared/generated/client";
import { CurrentQuestionType } from "@shared/types";
import { Response } from "@shared/generated/client";

export const interviewsRouter = createTRPCRouter({
  createInterviewSession: publicProcedure
    .input(
      z.object({
        shortenedStudyId: z.string(),
        testMode: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { shortenedStudyId, testMode } = input;

      console.log("Creating interview session:", {
        shortenedStudyId,
        testMode,
      });

      const study = await ctx.db.study.findUnique({
        where: {
          shortID: shortenedStudyId,
        },
        include: {
          _count: {
            select: {
              interviews: {
                where: {
                  status: "COMPLETED",
                  testMode: false,
                },
              },
            },
          },
        },
      });

      if (!study) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Study not found",
        });
      }

      console.log("Study interview count:", study._count.interviews);
      console.log("Study max responses:", study.maxResponses);

      if (study.maxResponses && study._count.interviews >= study.maxResponses) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "max-interviews-reached",
        });
      }

      const interviewSession = await ctx.db.interviewSession.create({
        data: {
          studyId: study.id,
          startTime: new Date().toISOString(),
          testMode,
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
              followUpQuestionOrder: "asc",
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
          responses: true,
        },
      });

      if (!interviewSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview session not found",
        });
      }

      // Calculate the current question
      let calculatedCurrentQuestion: CurrentQuestionType | null = null;

      if (interviewSession.CurrentQuestion) {
        const latestFollowUp =
          interviewSession.FollowUpQuestions.filter(
            (fq) =>
              fq.parentQuestionId === interviewSession.CurrentQuestion?.id,
          ).at(-1) ?? null;

        calculatedCurrentQuestion =
          latestFollowUp ?? interviewSession.CurrentQuestion;
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
        include: {
          multipleChoiceOptions: true,
          imageStimuli: true,
          videoStimuli: true,
          websiteStimuli: true,
        },
      });

      if (!firstQuestion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No questions found for this study",
        });
      }

      // Update the interview session with the first question
      await ctx.db.interviewSession.update({
        where: { id: interviewSessionId },
        data: {
          currentQuestionId: firstQuestion.id,
          status: "NOT_STARTED",
          lastUpdatedTime: new Date().toISOString(),
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
        },
      });

      return firstQuestion;
    }),
  getInterviewSessionResponses: publicProcedure
    .input(z.object({ interviewSessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { interviewSessionId } = input;

      const responses = await ctx.db.response.findMany({
        where: { interviewSessionId },
        include: {
          question: true,
          followUpQuestion: true,
        },
        orderBy: { createdAt: "asc" },
      });

      return responses;
    }),
  getInterviewSessionParticipant: privateProcedure
    .input(z.object({ interviewSessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { interviewSessionId } = input;

      const participant = await ctx.db.interviewParticipant.findUnique({
        where: { interviewSessionId },
        include: {
          demographicResponse: true,
        },
      });

      return participant;
    }),
});
