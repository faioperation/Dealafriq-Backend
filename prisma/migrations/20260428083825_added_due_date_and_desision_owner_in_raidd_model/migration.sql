-- AlterTable
ALTER TABLE "raidd" ADD COLUMN     "assumptionValidationDueDate" TIMESTAMP(3),
ADD COLUMN     "decisionDueDate" TIMESTAMP(3),
ADD COLUMN     "decisionOwner" TEXT;
