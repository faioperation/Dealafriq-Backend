/*
  Warnings:

  - You are about to drop the column `vendorEmail` on the `emails` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `emails` table. All the data in the column will be lost.
  - You are about to drop the column `vendorEmail` on the `outlooks` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `outlooks` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `vendorName` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the `vendors` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "emails" DROP CONSTRAINT "emails_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "outlooks" DROP CONSTRAINT "outlooks_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_created_by_fkey";

-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_updated_by_fkey";

-- AlterTable
ALTER TABLE "emails" DROP COLUMN "vendorEmail",
DROP COLUMN "vendorId",
ADD COLUMN     "clientEmail" TEXT,
ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "outlooks" DROP COLUMN "vendorEmail",
DROP COLUMN "vendorId",
ADD COLUMN     "clientEmail" TEXT,
ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "vendorId",
DROP COLUMN "vendorName",
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "clientName" TEXT;

-- DropTable
DROP TABLE "vendors";

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "numberOfProjects" INTEGER DEFAULT 0,
    "photoUrl" TEXT,
    "photoPath" TEXT,
    "contactPerson" TEXT,
    "contactRole" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactProjects" INTEGER DEFAULT 0,
    "contactDesignation" TEXT,
    "meetingLinks" JSONB DEFAULT '[]',
    "documents" JSONB DEFAULT '[]',
    "slas" JSONB DEFAULT '[]',
    "clientAiResponse" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "approved_by" TEXT,
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "Deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlooks" ADD CONSTRAINT "outlooks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
