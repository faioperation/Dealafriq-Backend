-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "decisions" TEXT,
ADD COLUMN     "raiddAnalysis" TEXT,
ADD COLUMN     "tasks" JSONB;

-- AlterTable
ALTER TABLE "outlooks" ADD COLUMN     "decisions" TEXT,
ADD COLUMN     "raiddAnalysis" TEXT,
ADD COLUMN     "tasks" JSONB;
