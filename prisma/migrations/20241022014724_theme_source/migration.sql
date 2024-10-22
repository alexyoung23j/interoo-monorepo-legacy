-- CreateEnum
CREATE TYPE "ThemeSource" AS ENUM ('MANUAL', 'AI_GENERATED');

-- AlterTable
ALTER TABLE "Theme" ADD COLUMN     "source" "ThemeSource" NOT NULL DEFAULT 'AI_GENERATED';
