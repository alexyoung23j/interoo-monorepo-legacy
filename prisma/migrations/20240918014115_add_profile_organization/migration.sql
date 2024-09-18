-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_organizationId_fkey";

-- AlterTable
ALTER TABLE "Profile" ALTER COLUMN "organizationId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProfileInOrganization" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isDefaultOrg" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileInOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileInOrganization_profileId_organizationId_key" ON "ProfileInOrganization"("profileId", "organizationId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileInOrganization" ADD CONSTRAINT "ProfileInOrganization_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileInOrganization" ADD CONSTRAINT "ProfileInOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
