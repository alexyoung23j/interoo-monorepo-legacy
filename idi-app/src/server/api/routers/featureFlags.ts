import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const featureFlagsRouter = createTRPCRouter({
  getFeatureFlags: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = input;

      try {
        const featureFlags = await ctx.db.featureFlag.findMany({
          where: { organizationId },
          select: {
            id: true,
            name: true,
            description: true,
            enabled: true,
          },
        });

        // Convert the array of feature flags to an object for easier consumption
        const featureFlagsObject = featureFlags.reduce<Record<string, boolean>>(
          (acc, flag) => {
            acc[flag.name] = flag.enabled;
            return acc;
          },
          {},
        );

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
        const updatedFlag = await ctx.db.featureFlag.updateMany({
          where: {
            name: flagName,
            organizationId: organizationId,
          },
          data: { enabled },
        });

        if (updatedFlag.count === 0) {
          throw new Error("Feature flag not found");
        }

        return { success: true, message: "Feature flag updated successfully" };
      } catch (error) {
        console.error("Error updating feature flag:", error);
        throw new Error("Failed to update feature flag");
      }
    }),

  createFeatureFlag: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        enabled: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, name, description, enabled } = input;

      try {
        const newFlag = await ctx.db.featureFlag.create({
          data: {
            organizationId,
            name,
            description,
            enabled,
          },
        });

        return newFlag;
      } catch (error) {
        console.error("Error creating feature flag:", error);
        throw new Error("Failed to create feature flag");
      }
    }),
});
