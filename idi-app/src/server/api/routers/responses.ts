import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const responsesRouter = createTRPCRouter({
  /**
   * Used to get study details for interview pages
   */
  createOpenEndedResponse: publicProcedure
    .input(
      z.object({
        questionId: z.string(),
        interviewSessionId: z.string(),
        followUpQuestionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { questionId, interviewSessionId, followUpQuestionId } = input;

      const response = await ctx.db.response.create({
        data: {
          questionId,
          interviewSessionId,
          followUpQuestionId,
          fastTranscribedText: "",
        },
      });

      if (!response) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create response",
        });
      }

      return response;
    }),
  createMultipleChoiceResponse: publicProcedure
    .input(
      z.object({
        questionId: z.string(),
        interviewSessionId: z.string(),
        studyId: z.string(),
        multipleChoiceOptionSelectionId: z.string(),
        currentQuestionOrder: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        questionId,
        interviewSessionId,
        multipleChoiceOptionSelectionId,
        currentQuestionOrder,
        studyId,
      } = input;

      // Create response
      await ctx.db.response.create({
        data: {
          questionId,
          interviewSessionId,
          multipleChoiceOptionId: multipleChoiceOptionSelectionId,
          fastTranscribedText: "",
        },
      });

      const nextQuestionOrder = currentQuestionOrder + 1;

      const nextQuestion = await ctx.db.question.findFirst({
        where: {
          studyId,
          questionOrder: nextQuestionOrder,
        },
      });

      if (!nextQuestion) {
        await ctx.db.interviewSession.update({
          where: {
            id: interviewSessionId,
          },
          data: {
            status: "COMPLETED",
          },
        });
      } else {
        await ctx.db.interviewSession.update({
          where: {
            id: interviewSessionId,
          },
          data: {
            currentQuestionId: nextQuestion.id,
          },
        });
      }

      return { nextQuestion, wasFinalQuestion: !nextQuestion };
    }),
  createRangeResponse: publicProcedure
    .input(
      z.object({
        questionId: z.string(),
        interviewSessionId: z.string(),
        studyId: z.string(),
        rangeSelection: z.number(),
        currentQuestionOrder: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        questionId,
        interviewSessionId,
        rangeSelection,
        currentQuestionOrder,
        studyId,
      } = input;

      // Create response
      await ctx.db.response.create({
        data: {
          questionId,
          interviewSessionId,
          rangeSelection,
          fastTranscribedText: "",
        },
      });

      const nextQuestionOrder = currentQuestionOrder + 1;

      const nextQuestion = await ctx.db.question.findFirst({
        where: {
          studyId,
          questionOrder: nextQuestionOrder,
        },
      });

      if (!nextQuestion) {
        await ctx.db.interviewSession.update({
          where: {
            id: interviewSessionId,
          },
          data: {
            status: "COMPLETED",
          },
        });
      } else {
        await ctx.db.interviewSession.update({
          where: {
            id: interviewSessionId,
          },
          data: {
            currentQuestionId: nextQuestion.id,
          },
        });
      }

      return { nextQuestion, wasFinalQuestion: !nextQuestion };
    }),
});
