-- AlterTable
ALTER TABLE "project_decisions" ADD COLUMN     "decisionOwner" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "actionPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "discussionPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "notes" TEXT;
