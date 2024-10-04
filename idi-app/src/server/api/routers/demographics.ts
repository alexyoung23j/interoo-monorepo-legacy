import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const demographicsRouter = createTRPCRouter({
  upsertDemographicResponse: publicProcedure
    .input(
      z.object({
        interviewSessionId: z.string(),
        name: z.string().optional(),
        email: z.string().optional(),
        phoneNumber: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { interviewSessionId, name, email, phoneNumber } = input;

      // Upsert the InterviewParticipant
      const interviewParticipant = await ctx.db.interviewParticipant.upsert({
        where: {
          interviewSessionId,
        },
        create: {
          interviewSessionId,
        },
        update: {},
      });

      // Upsert the DemographicResponse
      return ctx.db.demographicResponse.upsert({
        where: {
          interviewParticipantId: interviewParticipant.id,
        },
        create: {
          interviewParticipantId: interviewParticipant.id,
          name,
          email,
          phoneNumber,
        },
        update: {
          name,
          email,
          phoneNumber,
        },
      });
    }),
});
