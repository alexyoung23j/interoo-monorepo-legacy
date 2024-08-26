-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT DEFAULT '#F0F2F3',
ADD COLUMN     "secondaryColor" TEXT DEFAULT '#64748B';
