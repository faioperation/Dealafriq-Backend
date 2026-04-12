-- CreateEnum
CREATE TYPE "TaskHealthStatus" AS ENUM ('BAD', 'NORMAL', 'PERFECT');

-- AlterEnum
ALTER TYPE "HealthType" ADD VALUE 'TASK_STATUS';

-- AlterTable
ALTER TABLE "project_health" ADD COLUMN     "taskHealthStatus" "TaskHealthStatus";
