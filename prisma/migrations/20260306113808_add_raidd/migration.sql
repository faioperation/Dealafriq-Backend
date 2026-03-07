-- CreateEnum
CREATE TYPE "RaiddType" AS ENUM ('RISK', 'ASSUMPTION', 'ISSUE', 'DECISION', 'DEPENDENCY');

-- CreateEnum
CREATE TYPE "RaiddStatus" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "raidd" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "RaiddType" NOT NULL,
    "status" "RaiddStatus" NOT NULL,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "approved_by" TEXT,
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "raidd_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "raidd" ADD CONSTRAINT "raidd_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
