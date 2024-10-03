import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const demographicsRouter = createTRPCRouter({
  createDemographicResponse: publicProcedure
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

      // Create a new InterviewParticipant
      const interviewParticipant = await ctx.db.interviewParticipant.create({
        data: {
          interviewSessionId,
        },
      });

      // Create the DemographicResponse
      return ctx.db.demographicResponse.create({
        data: {
          interviewParticipantId: interviewParticipant.id,
          name,
          email,
          phoneNumber,
        },
      });
    }),
});
