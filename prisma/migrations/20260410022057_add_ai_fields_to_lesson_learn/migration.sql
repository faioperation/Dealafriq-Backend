-- AlterTable
ALTER TABLE "lesson_learns" ADD COLUMN     "actionable_warnings" JSONB,
ADD COLUMN     "aiResponse" JSONB,
ADD COLUMN     "current_situation_summary" TEXT,
ADD COLUMN     "historical_insights" JSONB,
ADD COLUMN     "status" TEXT,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "source" DROP NOT NULL,
ALTER COLUMN "loggedDate" DROP NOT NULL,
ALTER COLUMN "created_by" DROP NOT NULL;
