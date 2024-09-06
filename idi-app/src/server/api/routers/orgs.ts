import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const orgsRouter = createTRPCRouter({
  /**
   * Used to get study details for interview pages
   */
  getUserOrgMembership: privateProcedure
    .input(z.object({ shortenedStudyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session } = ctx;

      // check if the session
    }),
  // Create an invite for a user to join an organization
  createInvite: privateProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      // Generate a unique token
      const token =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Set expiration date (e.g., 7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create the invite
      const invite = await ctx.db.invite.create({
        data: {
          token,
          organizationId: input.organizationId,
          expiresAt,
        },
      });

      return invite;
    }),
  validateInvite: privateProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      const invite = await ctx.db.invite.findUnique({
        where: {
          token: input.token,
        },
        include: {
          organization: true,
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      if (invite.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired",
        });
      }

      if (invite.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has already been used",
        });
      }

      // Create a new profile for the user
      const newProfile = await ctx.db.profile.create({
        data: {
          name: session.data.session?.user.user_metadata.full_name ?? "",
          email: session.data.session?.user.email ?? "",
          organizationId: invite.organizationId,
          supabaseUserID: session.data.session?.user.id ?? "",
        },
      });

      // Mark the invite as used
      await ctx.db.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      return {
        success: true,
        profile: newProfile,
        organization: invite.organization,
      };
    }),
});
