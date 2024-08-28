/*
  Warnings:

  - Added the required column `title` to the `FollowUpQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FollowUpQuestion" ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "body" DROP NOT NULL;
