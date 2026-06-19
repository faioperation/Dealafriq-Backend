-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "aiCheck" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "outlooks" ADD COLUMN     "aiCheck" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "project_assumptions" ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "project_decisions" ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "project_dependencies" ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "project_documents" ADD COLUMN     "aiCheck" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rawAiResponse" JSONB;

-- AlterTable
ALTER TABLE "project_issues" ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "project_meetings" ADD COLUMN     "aiCheck" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rawAiResponse" JSONB;

-- AlterTable
ALTER TABLE "project_milestones" ADD COLUMN     "endDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "project_risks" ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "aiCheck" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vendorId" TEXT;

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "photoPath" TEXT,
    "photoUrl" TEXT,
    "numberOfProjects" INTEGER DEFAULT 0,
    "contactPerson" TEXT,
    "contactRole" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactDesignation" TEXT,
    "slaPath" TEXT,
    "slaUrl" TEXT,
    "documentPath" TEXT,
    "documentUrl" TEXT,
    "meetingLink" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
