/*
  Warnings:

  - Made the column `ttsProvider` on table `Study` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Study" ALTER COLUMN "ttsProvider" SET NOT NULL;
