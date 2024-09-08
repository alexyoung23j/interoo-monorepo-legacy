import { z } from "zod";
import { randomBytes } from "crypto";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { InterviewSessionStatus } from "@shared/generated/client";

export const orgsRouter = createTRPCRouter({
  /**
   * Used to get study details for interview pages
   */
  getUserOrgMembership: privateProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session } = ctx;

      const profile = await ctx.db.profile.findUnique({
        where: {
          email: session.data.session?.user.email ?? "",
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      const isOrgMember = profile.organizationId === input.orgId;

      return {
        isOrgMember,
      };
    }),
  getUserOrg: publicProcedure.query(async ({ ctx }) => {
    const { session } = ctx;

    const profile = await ctx.db.profile.findFirst({
      where: {
        email: session.data.session?.user.email ?? "",
      },
    });

    if (!profile) {
      return null;
    }

    return profile.organizationId;
  }),
  getProfile: privateProcedure.query(async ({ ctx }) => {
    const { session } = ctx;

    const currentProfile = await ctx.db.profile.findUnique({
      where: {
        email: session.data.session?.user.email ?? "",
      },
    });

    return currentProfile;
  }),
  getOrgStudies: privateProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const studies = await ctx.db.study.findMany({
        where: {
          organizationId: input.orgId,
        },
        include: {
          _count: {
            select: {
              interviews: {
                where: {
                  status: InterviewSessionStatus.COMPLETED,
                },
              },
            },
          },
          interviews: {
            where: {
              status: InterviewSessionStatus.COMPLETED,
            },
            orderBy: {
              lastUpdatedTime: "desc",
            },
            take: 1,
            select: {
              lastUpdatedTime: true,
            },
          },
        },
      });

      return studies.map((study) => ({
        ...study,
        completedInterviewsCount: study._count.interviews,
        mostRecentUpdate:
          study.interviews[0]?.lastUpdatedTime || study.updatedAt,
      }));
    }),
  getOrgDetails: privateProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        include: {
          users: true,
        },
      });
      return org;
    }),
  // Create an invite for a user to join an organization
  createInvite: privateProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Generate a unique token
      const token = randomBytes(12).toString("base64url");

      // Set expiration date 2 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2);

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
  getInviteDetailsFromToken: publicProcedure
    .input(z.object({ inviteToken: z.string() }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.invite.findUnique({
        where: {
          token: input.inviteToken,
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

      return { orgName: invite.organization.name };
    }),
  validateAndAcceptInvite: privateProcedure
    .input(z.object({ inviteToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      const invite = await ctx.db.invite.findUnique({
        where: {
          token: input.inviteToken,
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

      const existingProfileWithUserEmail = await ctx.db.profile.findUnique({
        where: {
          email: session.data.session?.user.email ?? "",
          organizationId: invite.organizationId,
        },
      });

      if (existingProfileWithUserEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has a profile",
        });
      }

      // Create a new profile for the user
      const newProfile = await ctx.db.profile.create({
        data: {
          name:
            (session.data?.session?.user?.user_metadata?.full_name as string) ??
            "",
          email: session.data?.session?.user?.email ?? "",
          organizationId: invite.organizationId,
          supabaseUserID: session.data.session?.user.id ?? "",
        },
      });

      // Mark the invite as used
      await ctx.db.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date().toISOString() },
      });

      return {
        profile: newProfile,
        organization: invite.organization,
      };
    }),
});
