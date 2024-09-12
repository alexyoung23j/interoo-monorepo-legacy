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
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const responses = await ctx.db.response.findMany({
        where: {
          questionId: input.questionId,
          interviewSession: {
            status: InterviewSessionStatus.COMPLETED,
          },
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
