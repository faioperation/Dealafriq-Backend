-- AlterTable
ALTER TABLE "project_documents" ADD COLUMN     "projectSummary" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "document_key_points" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_key_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_action_points" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_action_points_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "document_key_points" ADD CONSTRAINT "document_key_points_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "project_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_action_points" ADD CONSTRAINT "document_action_points_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "project_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
