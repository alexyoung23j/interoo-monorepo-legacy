-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "junkResponse" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BoostedKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "definition" TEXT,
    "studyId" TEXT NOT NULL,

    CONSTRAINT "BoostedKeyword_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BoostedKeyword" ADD CONSTRAINT "BoostedKeyword_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
