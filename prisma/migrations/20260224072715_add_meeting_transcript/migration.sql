-- CreateTable
CREATE TABLE "meeting_transcripts" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT,
    "platform" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "parsedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_transcripts_pkey" PRIMARY KEY ("id")
);
