import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

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
});
