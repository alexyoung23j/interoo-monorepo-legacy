import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";

export const favoritesRouter = createTRPCRouter({
  createFavorite: privateProcedure
    .input(
      z.object({
        studyId: z.string(),
        quoteId: z.string().optional(),
        responseId: z.string().optional(),
        interviewSessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { studyId, quoteId, responseId, interviewSessionId } = input;
      const { user } = ctx;

      const profile = await ctx.db.profile.findFirst({
        where: {
          supabaseUserID: user.id,
        },
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      const study = await ctx.db.study.findFirst({
        where: {
          id: studyId,
        },
      });

      if (!study) {
        throw new Error("Study not found");
      }

      const favorite = await ctx.db.favorite.create({
        data: {
          studyId,
          quoteId,
          responseId,
          interviewSessionId,
          createdById: profile.id,
        },
      });

      return favorite;
    }),
  removeFavorite: privateProcedure
    .input(
      z.object({
        favoriteId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { favoriteId } = input;
      const { user } = ctx;

      const profile = await ctx.db.profile.findFirst({
        where: {
          supabaseUserID: user.id,
        },
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      const favorite = await ctx.db.favorite.findFirst({
        where: {
          id: favoriteId,
          createdById: profile.id,
        },
      });

      if (!favorite) {
        throw new Error(
          "Favorite not found or you don't have permission to remove it",
        );
      }

      await ctx.db.favorite.delete({
        where: {
          id: favoriteId,
        },
      });

      return { success: true };
    }),
  getFavoriteQuotes: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { studyId } = input;

      const favoriteQuotes = await ctx.db.favorite.findMany({
        where: {
          studyId,
          quoteId: { not: null },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          quote: {
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
          },
        },
      });

      return favoriteQuotes;
    }),

  getFavoriteResponses: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { studyId } = input;

      const favoriteResponses = await ctx.db.favorite.findMany({
        where: {
          studyId,
          responseId: { not: null },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          response: {
            include: {
              interviewSession: {
                select: {
                  participant: {
                    select: {
                      demographicResponse: true,
                    },
                  },
                },
              },
              question: true,
              followUpQuestion: true,
              Favorites: true,
              Quote: {
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
              },
            },
          },
        },
      });

      return favoriteResponses;
    }),

  getFavoriteInterviewSessions: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { studyId } = input;

      const favoriteInterviewSessions = await ctx.db.favorite.findMany({
        where: {
          studyId,
          interviewSessionId: { not: null },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          interviewSession: {
            include: {
              participant: {
                include: {
                  demographicResponse: true,
                },
              },
              responses: {
                include: {
                  question: true,
                  followUpQuestion: true,
                  Quote: {
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
                  },
                },
              },
            },
          },
        },
      });

      return favoriteInterviewSessions;
    }),
});
