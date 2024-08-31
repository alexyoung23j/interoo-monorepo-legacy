/*
  Warnings:

  - You are about to drop the column `audioBucketUrl` on the `ResponseMedia` table. All the data in the column will be lost.
  - You are about to drop the column `videoBucketUrl` on the `ResponseMedia` table. All the data in the column will be lost.
  - Added the required column `mediaUrl` to the `ResponseMedia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ResponseMedia" DROP COLUMN "audioBucketUrl",
DROP COLUMN "videoBucketUrl",
ADD COLUMN     "mediaUrl" TEXT NOT NULL;
