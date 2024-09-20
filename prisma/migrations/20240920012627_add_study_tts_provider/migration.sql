-- CreateEnum
CREATE TYPE "TtsProvider" AS ENUM ('GOOGLE', 'ELEVENLABS');

-- AlterTable
ALTER TABLE "Study" ADD COLUMN     "ttsProvider" "TtsProvider" DEFAULT 'GOOGLE';
