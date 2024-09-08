import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";

export const questionsRouter = createTRPCRouter({
  getEnrichedStudyQuestions: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Maybe need maybe dont
    }),
  getResponses: privateProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const responses = await ctx.db.response.findMany({
        where: {
          questionId: input.questionId,
          followUpQuestionId: null,
        },
      });

      return responses;
    }),
});
