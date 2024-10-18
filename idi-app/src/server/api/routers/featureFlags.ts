import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const featureFlagsRouter = createTRPCRouter({
  getFeatureFlags: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = input;

      try {
        const organizationFeatureFlags =
          await ctx.db.organizationFeatureFlag.findMany({
            where: { organizationId },
            include: {
              featureFlag: {
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          });

        const featureFlagsObject = organizationFeatureFlags.reduce<
          Record<string, boolean>
        >((acc, { featureFlag, enabled }) => {
          acc[featureFlag.name] = enabled;
          return acc;
        }, {});

        return featureFlagsObject;
      } catch (error) {
        console.error("Error fetching feature flags:", error);
        throw new Error("Failed to fetch feature flags");
      }
    }),

  updateFeatureFlag: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        flagName: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, flagName, enabled } = input;

      try {
        const featureFlag = await ctx.db.featureFlag.findUnique({
          where: { name: flagName },
        });

        if (!featureFlag) {
          throw new Error("Feature flag not found");
        }

        const updatedFlag = await ctx.db.organizationFeatureFlag.upsert({
          where: {
            organizationId_featureFlagId: {
              organizationId,
              featureFlagId: featureFlag.id,
            },
          },
          update: { enabled },
          create: {
            organizationId,
            featureFlagId: featureFlag.id,
            enabled,
          },
        });

        return { success: true, message: "Feature flag updated successfully" };
      } catch (error) {
        console.error("Error updating feature flag:", error);
        throw new Error("Failed to update feature flag");
      }
    }),

  createFeatureFlag: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        organizationId: z.string().optional(),
        enabled: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, description, organizationId, enabled } = input;

      try {
        const newFlag = await ctx.db.featureFlag.create({
          data: {
            name,
            description,
          },
        });

        if (organizationId) {
          await ctx.db.organizationFeatureFlag.create({
            data: {
              organizationId,
              featureFlagId: newFlag.id,
              enabled,
            },
          });
        }

        return newFlag;
      } catch (error) {
        console.error("Error creating feature flag:", error);
        throw new Error("Failed to create feature flag");
      }
    }),

  getAllFeatureFlags: publicProcedure.query(async ({ ctx }) => {
    try {
      const featureFlags = await ctx.db.featureFlag.findMany({
        select: {
          id: true,
          name: true,
          description: true,
        },
      });

      return featureFlags;
    } catch (error) {
      console.error("Error fetching all feature flags:", error);
      throw new Error("Failed to fetch all feature flags");
    }
  }),
});
