/*
  Warnings:

  - You are about to drop the column `taskHealthStatus` on the `project_health` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HealthStatus" ADD VALUE 'BAD';
ALTER TYPE "HealthStatus" ADD VALUE 'NORMAL';
ALTER TYPE "HealthStatus" ADD VALUE 'PERFECT';

-- AlterTable
ALTER TABLE "project_health" DROP COLUMN "taskHealthStatus";

-- DropEnum
DROP TYPE "TaskHealthStatus";
