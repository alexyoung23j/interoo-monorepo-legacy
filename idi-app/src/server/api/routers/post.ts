import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: privateProcedure
    .input(z.object({ text: z.string() }))
    .query(({ ctx, input }) => {
      console.log({ ctx });
      return ctx.db.testTwo.create({
        data: {
          name: "test",
          field: "test",
          fieldTwo: "testTwo",
          fieldThree: "testhtree",
        },
      });
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.testTwo.create({
        data: {
          name: input.name,
          field: "test",
          fieldTwo: "testTwo",
          fieldThree: "testhtree",
          fieldFour: "testFour",
        },
      });
    }),

  getLatest: publicProcedure.query(async ({ ctx }) => {
    const post = await ctx.db.post.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return post ?? null;
  }),
});
