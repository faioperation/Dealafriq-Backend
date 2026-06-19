-- CreateTable
CREATE TABLE "outlook_calendar_events" (
    "id" TEXT NOT NULL,
    "outlook_event_id" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "web_link" TEXT,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "outlook_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outlook_calendar_events_outlook_event_id_key" ON "outlook_calendar_events"("outlook_event_id");

-- CreateIndex
CREATE INDEX "outlook_calendar_events_user_id_idx" ON "outlook_calendar_events"("user_id");

-- CreateIndex
CREATE INDEX "outlook_calendar_events_project_id_idx" ON "outlook_calendar_events"("project_id");

-- AddForeignKey
ALTER TABLE "outlook_calendar_events" ADD CONSTRAINT "outlook_calendar_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlook_calendar_events" ADD CONSTRAINT "outlook_calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
