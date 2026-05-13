/*
  Warnings:

  - You are about to drop the column `projectSummary` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyAiSummary` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `weeklySummaryDate` on the `projects` table. All the data in the column will be lost.
  - The `description` column on the `raidd` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the column `type` on the `raidd` table from a scalar field to a list field. If there are non-null values in that column, this step will fail.

*/
-- AlterTable
ALTER TABLE "AI_detection" ADD COLUMN     "emailId" TEXT,
ADD COLUMN     "outlookId" TEXT;

-- AlterTable
ALTER TABLE "project_milestones" ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "projectSummary",
DROP COLUMN "weeklyAiSummary",
DROP COLUMN "weeklySummaryDate";

-- AlterTable
ALTER TABLE "raidd" ADD COLUMN     "aiDetectionId" TEXT,
DROP COLUMN "description",
ADD COLUMN     "description" JSONB,
ALTER COLUMN "type" SET DATA TYPE "RaiddType"[] USING ARRAY["type"]::"RaiddType"[];

-- CreateTable
CREATE TABLE "weekly_ai_summaries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weeklyAiSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "weekly_ai_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_risks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "raiddId" TEXT,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assumptions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "raiddId" TEXT,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_assumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_issues" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "raiddId" TEXT,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_decisions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "raiddId" TEXT,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_dependencies" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "raiddId" TEXT,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_dependencies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AI_detection" ADD CONSTRAINT "AI_detection_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AI_detection" ADD CONSTRAINT "AI_detection_outlookId_fkey" FOREIGN KEY ("outlookId") REFERENCES "outlooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raidd" ADD CONSTRAINT "raidd_aiDetectionId_fkey" FOREIGN KEY ("aiDetectionId") REFERENCES "AI_detection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_ai_summaries" ADD CONSTRAINT "weekly_ai_summaries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_raiddId_fkey" FOREIGN KEY ("raiddId") REFERENCES "raidd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assumptions" ADD CONSTRAINT "project_assumptions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assumptions" ADD CONSTRAINT "project_assumptions_raiddId_fkey" FOREIGN KEY ("raiddId") REFERENCES "raidd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_raiddId_fkey" FOREIGN KEY ("raiddId") REFERENCES "raidd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_raiddId_fkey" FOREIGN KEY ("raiddId") REFERENCES "raidd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_raiddId_fkey" FOREIGN KEY ("raiddId") REFERENCES "raidd"("id") ON DELETE CASCADE ON UPDATE CASCADE;
