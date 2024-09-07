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
            include: {
              imageStimuli: true,
              websiteStimuli: true,
              videoStimuli: true,
              multipleChoiceOptions: true,
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
  /**
   * Used to get study for org study page
   */
  getStudy: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { studyId } = input;

      const study = await ctx.db.study.findUnique({
        where: {
          id: studyId,
        },
      });

      return study;
    }),
});
