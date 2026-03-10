/*
  Warnings:

  - You are about to drop the column `teamId` on the `projects` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_teamId_fkey";

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "designation" TEXT;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "teamId",
ADD COLUMN     "assignTeamId" TEXT,
ADD COLUMN     "projectOwnerId" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_projectOwnerId_fkey" FOREIGN KEY ("projectOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_assignTeamId_fkey" FOREIGN KEY ("assignTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
