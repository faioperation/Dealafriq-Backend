-- DropIndex
DROP INDEX "messages_userId_projectId_createdAt_idx";

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "messages_userId_createdAt_idx" ON "messages"("userId", "createdAt");
