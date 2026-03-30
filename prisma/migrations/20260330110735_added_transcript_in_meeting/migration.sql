/*
  Warnings:

  - The `aiMeetingSummary` column on the `project_meetings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "project_meetings" ADD COLUMN     "agenda" JSONB,
ADD COLUMN     "transcriptData" JSONB,
ADD COLUMN     "transcriptPath" TEXT,
ADD COLUMN     "transcriptUrl" TEXT,
DROP COLUMN "aiMeetingSummary",
ADD COLUMN     "aiMeetingSummary" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "projectAiSummary" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "projectProgress" TEXT DEFAULT '0%',
ADD COLUMN     "weeklyAiSummary" TEXT;
