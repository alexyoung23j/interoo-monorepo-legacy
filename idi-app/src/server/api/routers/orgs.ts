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
        include: {
          organizations: true,
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      const isOrgMember = profile.organizations.some(
        (org) => org.organizationId === input.orgId,
      );

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
      include: {
        organizations: true,
      },
    });

    if (!profile) {
      return null;
    }

    const defaultOrgId = profile.organizations.find(
      (org) => org.isDefaultOrg,
    )?.organizationId;

    return defaultOrgId;
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
                  testMode: false,
                },
              },
            },
          },
          interviews: {
            where: {
              status: InterviewSessionStatus.COMPLETED,
              testMode: false,
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
          study.interviews[0]?.lastUpdatedTime ?? study.updatedAt,
      }));
    }),
  getOrgDetails: privateProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        include: {
          profiles: true,
        },
      });
      return org;
    }),
  // Create an invite for a user to join an organization
  createInvite: privateProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const numberOfProfiles = await ctx.db.profile.count({
        where: {
          organizations: {
            some: {
              organizationId: input.organizationId,
            },
          },
        },
      });

      // TODO: Figure out how we want to handle seats
      if (numberOfProfiles >= 10) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Maximum number of profiles reached. Update your plan to add more users.",
        });
      }

      // Generate a unique token
      const token = randomBytes(12).toString("base64url");

      // Set expiration date 2 days from now
      const expiresAt = new Date(
        Date.now() + 2 * 24 * 60 * 60 * 1000,
      ).toISOString();

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

      let profile;
      const existingProfileWithUserEmail = await ctx.db.profile.findUnique({
        where: {
          email: session.data.session?.user.email ?? "",
        },
        include: {
          organizations: true,
        },
      });

      if (existingProfileWithUserEmail) {
        // Add the user to the organization
        await ctx.db.profileInOrganization.create({
          data: {
            organizationId: invite.organizationId,
            profileId: existingProfileWithUserEmail.id,
            isDefaultOrg: false,
          },
        });

        profile = existingProfileWithUserEmail;
      } else {
        // Create a new profile for the user
        const newProfile = await ctx.db.profile.create({
          data: {
            name:
              (session.data?.session?.user?.user_metadata
                ?.full_name as string) ?? "",
            email: session.data?.session?.user?.email ?? "",
            supabaseUserID: session.data.session?.user.id ?? "",
            organizations: {
              create: {
                organizationId: invite.organizationId,
                isDefaultOrg: true,
              },
            },
          },
        });

        profile = newProfile;
      }

      // Mark the invite as used
      await ctx.db.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date().toISOString() },
      });

      return {
        profile: profile,
        organization: invite.organization,
      };
    }),
  getBillingInfo: privateProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(
        Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1),
      );

      const studies = await ctx.db.study.findMany({
        where: { organizationId: input.orgId },
        include: {
          interviews: {
            where: {
              startTime: { gte: firstDayOfMonth },
            },
          },
        },
      });

      const studyBillingInfo = studies.map((study) => {
        const totalMinutes = study.interviews.reduce((acc, interview) => {
          const currentUTCDate = new Date(Date.now());
          const duration =
            (interview.lastUpdatedTime ?? currentUTCDate).getTime() -
            (interview.startTime ?? currentUTCDate).getTime();
          const durationInMinutes = Math.max(0, duration / (1000 * 60));

          if (study.targetLength) {
            return acc + Math.min(study.targetLength * 1.25, durationInMinutes);
          } else {
            return acc + Math.min(60, durationInMinutes);
          }
        }, 0);

        return {
          studyId: study.id,
          studyName: study.title,
          minutes: Math.round(totalMinutes),
        };
      });

      const totalMinutes = studyBillingInfo.reduce(
        (acc, study) => acc + study.minutes,
        0,
      );

      return {
        studyBillingInfo,
        totalMinutes,
      };
    }),
});
