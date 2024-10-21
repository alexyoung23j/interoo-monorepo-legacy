import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";

export const themesRouter = createTRPCRouter({
  removeThemeFromQuote: privateProcedure
    .input(z.object({ quoteId: z.string(), themeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { quoteId, themeId } = input;

      const res = await ctx.db.quotesOnTheme.deleteMany({
        where: {
          quoteId,
          themeId,
        },
      });

      console.log({ res });

      return { success: true };
    }),

  getStudyThemes: privateProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const themes = await ctx.db.theme.findMany({
        where: { studyId: input.studyId },
        include: {
          QuotesOnTheme: true,
        },
      });
      return themes.map((theme) => ({
        ...theme,
        quoteCount: theme.QuotesOnTheme.length,
      }));
    }),

  getThemeDetails: privateProcedure
    .input(
      z.object({ themeId: z.string(), studyId: z.string(), orgId: z.string() }),
    )
    .query(async ({ ctx, input }) => {
      const theme = await ctx.db.theme.findUnique({
        where: { id: input.themeId },
        include: {
          QuotesOnTheme: {
            include: {
              quote: {
                include: {
                  response: {
                    include: {
                      question: true,
                      followUpQuestion: true,
                      interviewSession: true,
                    },
                  },
                  Favorites: {
                    where: {
                      studyId: input.studyId,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!theme) {
        throw new Error("Theme not found");
      }

      return {
        ...theme,
        quotes: theme.QuotesOnTheme.map((qot) => ({
          ...qot.quote,
          response: qot.quote.response,
        })),
        studyId: input.studyId,
        orgId: input.orgId,
      };
    }),

  createTheme: privateProcedure
    .input(
      z.object({
        studyId: z.string(),
        name: z.string(),
        description: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { studyId, name, description } = input;

      const newTheme = await ctx.db.theme.create({
        data: {
          studyId,
          name,
          description,
          tagColor:
            "#" +
            Math.floor(Math.random() * 16777215)
              .toString(16)
              .padStart(6, "0"),
        },
      });

      return newTheme;
    }),

  deleteQuote: privateProcedure
    .input(z.object({ quoteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { quoteId } = input;

      // Delete the quote itself
      // This will automatically delete related QuotesOnTheme records due to the cascade delete
      await ctx.db.quote.delete({
        where: {
          id: quoteId,
        },
      });

      return { success: true };
    }),

  removeQuoteFromTheme: privateProcedure
    .input(z.object({ quoteId: z.string(), themeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { quoteId, themeId } = input;

      // Remove the association between the quote and the theme
      await ctx.db.quotesOnTheme.deleteMany({
        where: {
          quoteId,
          themeId,
        },
      });

      return { success: true };
    }),
});
