/*
  Warnings:

  - Added the required column `mediaEndTime` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mediaStartTime` to the `Quote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "mediaEndTime" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "mediaStartTime" DOUBLE PRECISION NOT NULL;
