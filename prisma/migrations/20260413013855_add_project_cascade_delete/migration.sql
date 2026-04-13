-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_projectId_fkey";

-- DropForeignKey
ALTER TABLE "google_calendar_events" DROP CONSTRAINT "google_calendar_events_project_id_fkey";

-- DropForeignKey
ALTER TABLE "lesson_learns" DROP CONSTRAINT "lesson_learns_projectId_fkey";

-- DropForeignKey
ALTER TABLE "meeting_transcripts" DROP CONSTRAINT "meeting_transcripts_projectId_fkey";

-- DropForeignKey
ALTER TABLE "raidd" DROP CONSTRAINT "raidd_projectId_fkey";

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_transcripts" ADD CONSTRAINT "meeting_transcripts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raidd" ADD CONSTRAINT "raidd_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_learns" ADD CONSTRAINT "lesson_learns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_events" ADD CONSTRAINT "google_calendar_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
