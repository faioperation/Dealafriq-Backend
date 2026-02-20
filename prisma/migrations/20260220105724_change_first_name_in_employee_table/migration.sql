/*
  Warnings:

  - You are about to drop the column `approvedById` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `deletedById` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `updatedById` on the `employees` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `employees` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_createdById_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_teamId_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_updatedById_fkey";

-- DropIndex
DROP INDEX "employees_email_key";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "approvedById",
DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "deletedAt",
DROP COLUMN "deletedById",
DROP COLUMN "email",
DROP COLUMN "passwordHash",
DROP COLUMN "projectId",
DROP COLUMN "teamId",
DROP COLUMN "updatedAt",
DROP COLUMN "updatedById",
ADD COLUMN     "Deleted_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "project_id" TEXT,
ADD COLUMN     "teams_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_teams_id_fkey" FOREIGN KEY ("teams_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
