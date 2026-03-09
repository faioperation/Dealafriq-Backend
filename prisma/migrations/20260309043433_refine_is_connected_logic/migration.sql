/*
  Warnings:

  - You are about to drop the column `isConnected` on the `emails` table. All the data in the column will be lost.
  - You are about to drop the column `isConnected` on the `outlooks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "emails" DROP COLUMN "isConnected";

-- AlterTable
ALTER TABLE "outlooks" DROP COLUMN "isConnected";
