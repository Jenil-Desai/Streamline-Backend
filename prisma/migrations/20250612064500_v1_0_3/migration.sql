-- AlterTable
ALTER TABLE "User" ADD COLUMN     "movies_watched" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shows_watched" INTEGER NOT NULL DEFAULT 0;
