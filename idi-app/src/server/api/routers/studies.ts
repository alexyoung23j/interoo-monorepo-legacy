import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Language, StudyStatus } from "@shared/generated/client";

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
          boostedKeywords: true,
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
  updateStudy: privateProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        targetLength: z.number().int().optional(),
        welcomeDescription: z.string().optional(),
        termsAndConditions: z.string().optional(),
        welcomeImageUrl: z.string().optional(),
        studyBackground: z.string().optional(),
        videoEnabled: z.boolean().optional(),
        maxResponses: z.number().int().optional(),
        status: z.nativeEnum(StudyStatus).optional(),
        reportingLanguage: z.nativeEnum(Language).optional(),
        languages: z.array(z.nativeEnum(Language)).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const updatedStudy = await ctx.db.study.update({
        where: { id },
        data: updateData,
      });

      return updatedStudy;
    }),
});
