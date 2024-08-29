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
  createResponse: publicProcedure
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
});
