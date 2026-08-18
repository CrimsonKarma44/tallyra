-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatar" BLOB;
ALTER TABLE "User" ADD COLUMN "avatarMime" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarUpdatedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
