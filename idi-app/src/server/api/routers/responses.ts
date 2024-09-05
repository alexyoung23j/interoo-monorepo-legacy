import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const responsesRouter = createTRPCRouter({
  createOrUpdateMultipleChoiceResponse: publicProcedure
    .input(
      z.object({
        responseId: z.string().optional(),
        questionId: z.string(),
        interviewSessionId: z.string(),
        studyId: z.string(),
        multipleChoiceOptionSelectionId: z.string(),
        currentQuestionOrder: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        responseId,
        questionId,
        interviewSessionId,
        multipleChoiceOptionSelectionId,
        currentQuestionOrder,
        studyId,
      } = input;

      // Create or update response
      const response = await ctx.db.response.upsert({
        where: {
          id: responseId ?? "",
        },
        update: {
          multipleChoiceOptionId: multipleChoiceOptionSelectionId,
        },
        create: {
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

  createOrUpdateRangeResponse: publicProcedure
    .input(
      z.object({
        responseId: z.string().optional(),
        questionId: z.string(),
        interviewSessionId: z.string(),
        studyId: z.string(),
        rangeSelection: z.number(),
        currentQuestionOrder: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        responseId,
        questionId,
        interviewSessionId,
        rangeSelection,
        currentQuestionOrder,
        studyId,
      } = input;

      // Create or update response
      const response = await ctx.db.response.upsert({
        where: {
          id: responseId ?? "",
        },
        update: {
          rangeSelection,
        },
        create: {
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
