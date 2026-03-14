/*
  Warnings:

  - The `raiddAnalysis` column on the `emails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `raiddAnalysis` column on the `outlooks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "AI_detection" ADD COLUMN     "raiddAnalysis" JSONB;

-- AlterTable
ALTER TABLE "emails" DROP COLUMN "raiddAnalysis",
ADD COLUMN     "raiddAnalysis" JSONB;

-- AlterTable
ALTER TABLE "outlooks" DROP COLUMN "raiddAnalysis",
ADD COLUMN     "raiddAnalysis" JSONB;
