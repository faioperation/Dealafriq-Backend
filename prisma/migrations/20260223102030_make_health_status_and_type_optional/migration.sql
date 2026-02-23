/*
  Warnings:

  - You are about to drop the column `budgetStatus` on the `project_health` table. All the data in the column will be lost.
  - You are about to drop the column `overallStatus` on the `project_health` table. All the data in the column will be lost.
  - You are about to drop the column `teamSentiment` on the `project_health` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `project_health` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "HealthType" AS ENUM ('OVERALL_STATUS', 'BUDGET_STATUS', 'TEAM_SENTIMENT');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('ON_TRACK', 'PENDING', 'AT_RISK', 'OFF_TRACK', 'GOOD', 'EXCELLENT', 'LOW');

-- DropIndex
DROP INDEX "project_health_projectId_key";

-- AlterTable
ALTER TABLE "project_health" DROP COLUMN "budgetStatus",
DROP COLUMN "overallStatus",
DROP COLUMN "teamSentiment",
DROP COLUMN "updatedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "healthStatus" "HealthStatus",
ADD COLUMN     "type" "HealthType",
ALTER COLUMN "status" DROP DEFAULT;
