/*
  Warnings:

  - You are about to drop the column `projectSummary` on the `project_documents` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `project_meetings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "project_agreements" DROP CONSTRAINT "project_agreements_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_assignments" DROP CONSTRAINT "project_assignments_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_documents" DROP CONSTRAINT "project_documents_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_health" DROP CONSTRAINT "project_health_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_meetings" DROP CONSTRAINT "project_meetings_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_milestones" DROP CONSTRAINT "project_milestones_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_tasks" DROP CONSTRAINT "project_tasks_projectId_fkey";

-- AlterTable
ALTER TABLE "project_documents" DROP COLUMN "projectSummary",
ADD COLUMN     "aiDocumentSummary" TEXT;

-- AlterTable
ALTER TABLE "project_meetings" DROP COLUMN "summary",
ADD COLUMN     "aiMeetingSummary" TEXT,
ADD COLUMN     "lastMeetingSummary" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "weeklyMeetingSummary" TEXT;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_meetings" ADD CONSTRAINT "project_meetings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_agreements" ADD CONSTRAINT "project_agreements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_health" ADD CONSTRAINT "project_health_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
