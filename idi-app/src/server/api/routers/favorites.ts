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
});
