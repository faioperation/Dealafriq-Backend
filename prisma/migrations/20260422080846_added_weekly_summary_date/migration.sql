/*
  Warnings:

  - You are about to drop the `project_health` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "project_health" DROP CONSTRAINT "project_health_projectId_fkey";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "projectHealth" JSONB,
ADD COLUMN     "weeklySummaryDate" TIMESTAMP(3);

-- DropTable
DROP TABLE "project_health";

-- DropEnum
DROP TYPE "HealthStatus";

-- DropEnum
DROP TYPE "HealthType";
