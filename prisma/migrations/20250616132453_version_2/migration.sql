-- AlterEnum
ALTER TYPE "WatchStatus" ADD VALUE 'DROPPED';

-- AlterTable
ALTER TABLE "Watchlist" ADD COLUMN     "emoji" TEXT NOT NULL DEFAULT '🔖';

-- AlterTable
ALTER TABLE "WatchlistItem" ADD COLUMN     "note" TEXT;
