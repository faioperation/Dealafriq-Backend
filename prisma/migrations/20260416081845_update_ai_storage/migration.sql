/*
  Warnings:

  - The `raiddAnalysis` column on the `AI_detection` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `raiddAnalysis` column on the `emails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `raiddAnalysis` column on the `outlooks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "AI_detection" ADD COLUMN     "fullAiResponse" JSONB,
DROP COLUMN "raiddAnalysis",
ADD COLUMN     "raiddAnalysis" JSONB;

-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "fullAiResponse" JSONB,
DROP COLUMN "raiddAnalysis",
ADD COLUMN     "raiddAnalysis" JSONB;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "outlooks" ADD COLUMN     "fullAiResponse" JSONB,
DROP COLUMN "raiddAnalysis",
ADD COLUMN     "raiddAnalysis" JSONB;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "vendorAiResponse" JSONB;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
