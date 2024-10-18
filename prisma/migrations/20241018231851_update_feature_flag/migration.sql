/*
  Warnings:

  - You are about to drop the column `enabled` on the `FeatureFlag` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `FeatureFlag` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `FeatureFlag` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FeatureFlag" DROP CONSTRAINT "FeatureFlag_organizationId_fkey";

-- AlterTable
ALTER TABLE "FeatureFlag" DROP COLUMN "enabled",
DROP COLUMN "organizationId";

-- CreateTable
CREATE TABLE "OrganizationFeatureFlag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFeatureFlag_organizationId_featureFlagId_key" ON "OrganizationFeatureFlag"("organizationId", "featureFlagId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- AddForeignKey
ALTER TABLE "OrganizationFeatureFlag" ADD CONSTRAINT "OrganizationFeatureFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationFeatureFlag" ADD CONSTRAINT "OrganizationFeatureFlag_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
