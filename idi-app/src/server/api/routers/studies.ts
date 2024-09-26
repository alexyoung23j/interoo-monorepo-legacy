import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  InterviewSessionStatus,
  Language,
  Question,
  Study,
  StudyStatus,
  Response,
} from "@shared/generated/client";
import { FastForwardCircle } from "@phosphor-icons/react/dist/ssr";
import { ExtendedStudy } from "@/app/_components/org/study/results/ResultsPageComponent";

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
   * Used to get study for org study page. Returns an augmented Study type with additional calculated metadata needed for client display
   */
  getStudy: privateProcedure
    .input(
      z.object({
        studyId: z.string(),
        includeQuestions: z.boolean().optional(),
        includeBoostedKeywords: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        studyId,
        includeQuestions = false,
        includeBoostedKeywords = false,
      } = input;

      const study = await ctx.db.study.findUnique({
        where: { id: studyId },
        include: {
          interviews: {
            select: { status: true },
            where: { testMode: false },
          },
          ...(includeQuestions
            ? {
                questions: {
                  include: {
                    _count: {
                      select: {
                        Response: {
                          where: {
                            followUpQuestionId: null,
                            interviewSession: {
                              status: {
                                not: InterviewSessionStatus.NOT_STARTED,
                              },
                              testMode: false,
                            },
                            fastTranscribedText: {
                              not: "",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              }
            : {}),
          ...(includeBoostedKeywords
            ? {
                boostedKeywords: true,
              }
            : {}),
        },
      });

      if (!study) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Study not found",
        });
      }

      const completedInterviewsCount = study.interviews.filter(
        (session) => session.status === InterviewSessionStatus.COMPLETED,
      ).length;
      const inProgressInterviewsCount = study.interviews.filter(
        (session) => session.status === InterviewSessionStatus.IN_PROGRESS,
      ).length;

      const result = {
        ...study,
        completedInterviewsCount,
        inProgressInterviewsCount,
        interviews: undefined,
      };

      return result;
    }),
  /**
   * Used to update study metadata
   */
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
        boostedKeywords: z
          .array(
            z.object({
              keyword: z.string(),
              definition: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, boostedKeywords, ...updateData } = input;

      const updatedStudy = await ctx.db.study.update({
        where: { id },
        data: {
          ...updateData,
          boostedKeywords: {
            deleteMany: {},
            create: boostedKeywords,
          },
        },
        include: {
          boostedKeywords: true,
        },
      });

      return updatedStudy;
    }),
  /**
   * Used to fetch all interview sessions for a given study
   */
  getStudyInterviews: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { studyId } = input;

      const interviewSessions = await ctx.db.interviewSession.findMany({
        where: {
          studyId,
          status: { not: InterviewSessionStatus.NOT_STARTED },
          testMode: false,
        },
        include: {
          participant: true,
          study: true,
        },
        orderBy: { startTime: "desc" },
      });

      const completedInterviewsCount = interviewSessions.filter(
        (session) => session.status === InterviewSessionStatus.COMPLETED,
      ).length;

      const inProgressInterviewsCount = interviewSessions.filter(
        (session) => session.status === InterviewSessionStatus.IN_PROGRESS,
      ).length;

      return {
        interviewSessions,
        completedInterviewsCount,
        inProgressInterviewsCount,
      };
    }),
  checkStudyExists: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { studyId } = input;

      const study = await ctx.db.study.findUnique({
        where: { id: studyId },
      });

      return study;
    }),
  createBlankStudy: privateProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = input;

      const currentDate = new Date();
      const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;

      const newStudy = await ctx.db.study.create({
        data: {
          organizationId,
          title: `Untitled Draft (${formattedDate})`,
          shortID: Math.random().toString(36).substring(2, 8),
          targetLength: 0,
          welcomeDescription: "",
          termsAndConditions: "",
          welcomeImageUrl: "",
          studyBackground: "",
          videoEnabled: false,
          maxResponses: null,
          status: StudyStatus.DRAFT,
          reportingLanguage: Language.ENGLISH,
          languages: [Language.ENGLISH],
        },
      });

      return newStudy;
    }),
  getStudyQuestions: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { studyId } = input;

      const questions = await ctx.db.question.findMany({
        where: { studyId },
        orderBy: { questionOrder: "asc" },
        include: {
          imageStimuli: true,
          websiteStimuli: true,
          videoStimuli: true,
          multipleChoiceOptions: true,
        },
      });
      return questions;
    }),
});
