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
});
