-- AlterTable
ALTER TABLE "project_assumptions" ADD COLUMN     "aiDetectionId" TEXT,
ADD COLUMN     "emailId" TEXT,
ADD COLUMN     "outlookId" TEXT;

-- AlterTable
ALTER TABLE "project_decisions" ADD COLUMN     "aiDetectionId" TEXT,
ADD COLUMN     "emailId" TEXT,
ADD COLUMN     "outlookId" TEXT;

-- AlterTable
ALTER TABLE "project_dependencies" ADD COLUMN     "aiDetectionId" TEXT,
ADD COLUMN     "emailId" TEXT,
ADD COLUMN     "outlookId" TEXT;

-- AlterTable
ALTER TABLE "project_issues" ADD COLUMN     "aiDetectionId" TEXT,
ADD COLUMN     "emailId" TEXT,
ADD COLUMN     "outlookId" TEXT;

-- AlterTable
ALTER TABLE "project_risks" ADD COLUMN     "aiDetectionId" TEXT,
ADD COLUMN     "emailId" TEXT,
ADD COLUMN     "outlookId" TEXT;

-- AddForeignKey
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_outlookId_fkey" FOREIGN KEY ("outlookId") REFERENCES "outlooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_aiDetectionId_fkey" FOREIGN KEY ("aiDetectionId") REFERENCES "AI_detection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assumptions" ADD CONSTRAINT "project_assumptions_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assumptions" ADD CONSTRAINT "project_assumptions_outlookId_fkey" FOREIGN KEY ("outlookId") REFERENCES "outlooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assumptions" ADD CONSTRAINT "project_assumptions_aiDetectionId_fkey" FOREIGN KEY ("aiDetectionId") REFERENCES "AI_detection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_outlookId_fkey" FOREIGN KEY ("outlookId") REFERENCES "outlooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_aiDetectionId_fkey" FOREIGN KEY ("aiDetectionId") REFERENCES "AI_detection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_outlookId_fkey" FOREIGN KEY ("outlookId") REFERENCES "outlooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_aiDetectionId_fkey" FOREIGN KEY ("aiDetectionId") REFERENCES "AI_detection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_outlookId_fkey" FOREIGN KEY ("outlookId") REFERENCES "outlooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_aiDetectionId_fkey" FOREIGN KEY ("aiDetectionId") REFERENCES "AI_detection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
