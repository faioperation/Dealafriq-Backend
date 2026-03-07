-- CreateTable
CREATE TABLE "outlooks" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "senderEmail" TEXT NOT NULL,
    "receiverEmail" TEXT,
    "vendorEmail" TEXT,
    "outlookMessageId" TEXT,
    "category" TEXT,
    "receivedAt" TIMESTAMP(3),
    "vendorId" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "approved_by" TEXT,
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "Deleted_at" TIMESTAMP(3),

    CONSTRAINT "outlooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outlooks_outlookMessageId_receiverEmail_key" ON "outlooks"("outlookMessageId", "receiverEmail");

-- AddForeignKey
ALTER TABLE "outlooks" ADD CONSTRAINT "outlooks_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlooks" ADD CONSTRAINT "outlooks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlooks" ADD CONSTRAINT "outlooks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlooks" ADD CONSTRAINT "outlooks_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlooks" ADD CONSTRAINT "outlooks_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
