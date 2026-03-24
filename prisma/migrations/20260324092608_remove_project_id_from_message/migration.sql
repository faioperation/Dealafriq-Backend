/*
  Warnings:

  - You are about to drop the column `projectId` on the `messages` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_projectId_fkey";

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "projectId";
