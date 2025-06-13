import { Hono } from "hono";
import { Bindings } from "../../../types";
import {
  getUserWatchlistsHandler,
  createWatchlistHandler,
  updateWatchlistHandler,
  deleteWatchlistHandler,
  getWatchlistItemsHandler,
  addWatchlistItemHandler,
  updateWatchlistItemHandler,
  deleteWatchlistItemHandler
} from "../../../handlers/watchlists";
import { verifyToken } from "../../../middlewares/verifyToken";

export const watchlistsRouter = new Hono<{ Bindings: Bindings }>();

// Get all user watchlists
watchlistsRouter.get('/', verifyToken, ...getUserWatchlistsHandler);

// Create new watchlist
watchlistsRouter.post('/', verifyToken, ...createWatchlistHandler);

// Update watchlist
watchlistsRouter.put('/:id', verifyToken, ...updateWatchlistHandler);

// Delete watchlist
watchlistsRouter.delete('/:id', verifyToken, ...deleteWatchlistHandler);

// Get all items in watchlist
watchlistsRouter.get('/:id/items', verifyToken, ...getWatchlistItemsHandler);

// Add item to watchlist
watchlistsRouter.post('/:id/items', verifyToken, ...addWatchlistItemHandler);

// Update item (status/schedule)
watchlistsRouter.put('/:id/items/:itemId', verifyToken, ...updateWatchlistItemHandler);

// Remove item from watchlist
watchlistsRouter.delete('/:id/items/:itemId', verifyToken, ...deleteWatchlistItemHandler);
