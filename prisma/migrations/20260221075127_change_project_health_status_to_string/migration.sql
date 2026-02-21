/*
  Warnings:

  - Changed the type of `overallStatus` on the `project_health` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `budgetStatus` on the `project_health` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `teamSentiment` on the `project_health` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "KeyPointStatus" AS ENUM ('VALIDATED', 'TO_BE_VALIDATED');

-- CreateEnum
CREATE TYPE "ActionPointStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "project_health" ADD COLUMN     "score" INTEGER,
ADD COLUMN     "status" TEXT,
DROP COLUMN "overallStatus",
ADD COLUMN     "overallStatus" TEXT NOT NULL,
DROP COLUMN "budgetStatus",
ADD COLUMN     "budgetStatus" TEXT NOT NULL,
DROP COLUMN "teamSentiment",
ADD COLUMN     "teamSentiment" TEXT NOT NULL;

-- DropEnum
DROP TYPE "BudgetStatus";

-- DropEnum
DROP TYPE "HealthStatus";

-- CreateTable
CREATE TABLE "meeting_key_points" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "KeyPointStatus" NOT NULL DEFAULT 'TO_BE_VALIDATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_key_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_action_points" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ActionPointStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_action_points_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "meeting_key_points" ADD CONSTRAINT "meeting_key_points_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "project_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_action_points" ADD CONSTRAINT "meeting_action_points_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "project_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
