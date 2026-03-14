-- AlterTable
ALTER TABLE "AI_detection" ADD COLUMN     "raiddMessage" TEXT,
ALTER COLUMN "raiddAnalysis" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "raiddMessage" TEXT,
ALTER COLUMN "raiddAnalysis" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "outlooks" ADD COLUMN     "raiddMessage" TEXT,
ALTER COLUMN "raiddAnalysis" SET DATA TYPE TEXT;
