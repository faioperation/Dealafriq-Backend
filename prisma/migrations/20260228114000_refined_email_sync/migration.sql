-- AlterTable
ALTER TABLE "emails" ADD COLUMN "gmailMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "emails_gmailMessageId_receiverEmail_key" ON "emails"("gmailMessageId", "receiverEmail");
