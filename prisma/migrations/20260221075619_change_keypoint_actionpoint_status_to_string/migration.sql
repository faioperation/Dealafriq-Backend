/*
  Warnings:

  - The `status` column on the `meeting_action_points` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `meeting_key_points` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "meeting_action_points" DROP COLUMN "status",
ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "meeting_key_points" DROP COLUMN "status",
ADD COLUMN     "status" TEXT;

-- DropEnum
DROP TYPE "ActionPointStatus";

-- DropEnum
DROP TYPE "KeyPointStatus";
