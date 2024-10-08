import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { InterviewSessionStatus } from "@shared/generated/client";

export const questionsRouter = createTRPCRouter({
  getEnrichedStudyQuestions: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Maybe need maybe dont
    }),
  getResponses: privateProcedure
    .input(
      z.object({
        questionId: z.string(),
        includeQuestions: z.boolean().optional(),
        includeQuotes: z.boolean().optional(),
        includeParticipantDemographics: z.boolean().optional(),
        interviewSessionId: z.string().optional(),
        includeFavorites: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const responses = await ctx.db.response.findMany({
        where: {
          questionId: input.questionId,
          interviewSession: {
            // status: InterviewSessionStatus.COMPLETED,
            testMode: false,
            ...(input.interviewSessionId
              ? { id: input.interviewSessionId }
              : {}),
          },
        },
        include: {
          interviewSession: input.includeParticipantDemographics
            ? {
                select: {
                  participant: {
                    select: {
                      demographicResponse: true,
                    },
                  },
                },
              }
            : false,
          question: input.includeQuestions,
          followUpQuestion: input.includeQuestions,
          Favorites: input.includeFavorites,
          Quote: input.includeQuotes
            ? {
                include: {
                  QuotesOnTheme: {
                    include: {
                      theme: true,
                    },
                  },
                  QuotesOnAttribute: {
                    include: {
                      attribute: true,
                    },
                  },
                },
              }
            : false,
        },
        orderBy: {
          interviewSession: {
            startTime: "asc",
          },
        },
      });
      return responses;
    }),
  getMultipleChoiceOptions: privateProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const options = await ctx.db.multipleChoiceOption.findMany({
        where: {
          questionId: input.questionId,
        },
      });

      return options;
    }),
});
