-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'AGENT');

-- CreateTable
CREATE TABLE "lesson_learns" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "clientName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "loggedDate" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "approved_by" TEXT,
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lesson_learns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_calendar_events" (
    "id" TEXT NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "html_link" TEXT,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "google_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" "SenderType" NOT NULL,
    "agentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_learns_projectId_idx" ON "lesson_learns"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_events_google_event_id_key" ON "google_calendar_events"("google_event_id");

-- CreateIndex
CREATE INDEX "google_calendar_events_user_id_idx" ON "google_calendar_events"("user_id");

-- CreateIndex
CREATE INDEX "google_calendar_events_project_id_idx" ON "google_calendar_events"("project_id");

-- CreateIndex
CREATE INDEX "messages_userId_projectId_createdAt_idx" ON "messages"("userId", "projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "lesson_learns" ADD CONSTRAINT "lesson_learns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_events" ADD CONSTRAINT "google_calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_events" ADD CONSTRAINT "google_calendar_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
