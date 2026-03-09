-- AlterTable
ALTER TABLE "email_accounts" ADD COLUMN     "isConnected" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "isConnected" BOOLEAN DEFAULT true;

-- AlterTable
ALTER TABLE "outlooks" ADD COLUMN     "isConnected" BOOLEAN DEFAULT true;
