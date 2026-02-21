/*
  Warnings:

  - The `fileType` column on the `project_agreements` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "project_agreements" DROP COLUMN "fileType",
ADD COLUMN     "fileType" TEXT;

-- DropEnum
DROP TYPE "DocumentType";
