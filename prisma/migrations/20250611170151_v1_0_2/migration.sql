-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ADD COLUMN     "on_boarded" BOOLEAN NOT NULL DEFAULT false;
