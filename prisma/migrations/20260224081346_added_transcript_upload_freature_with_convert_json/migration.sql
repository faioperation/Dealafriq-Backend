-- AlterTable
ALTER TABLE "meeting_transcripts" ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE INDEX "meeting_transcripts_projectId_idx" ON "meeting_transcripts"("projectId");

-- AddForeignKey
ALTER TABLE "meeting_transcripts" ADD CONSTRAINT "meeting_transcripts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
