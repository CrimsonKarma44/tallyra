-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletionRequestedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "deletionReason" TEXT;
