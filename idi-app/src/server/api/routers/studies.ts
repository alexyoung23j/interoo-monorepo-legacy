import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const studiesRouter = createTRPCRouter({
  /**
   * Used to get study details for interview pages
   */
  getStudyDetails: publicProcedure
    .input(z.object({ shortenedStudyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { shortenedStudyId } = input;

      const study = await ctx.db.study.findUnique({
        where: {
          shortID: shortenedStudyId,
        },
        include: {
          questions: {
            orderBy: {
              questionOrder: "asc",
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

      const organization = await ctx.db.organization.findUnique({
        where: {
          id: study.organizationId,
        },
      });

      return { study, organization };
    }),
});
