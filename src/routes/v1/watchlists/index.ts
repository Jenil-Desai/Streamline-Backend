import { Hono } from "hono";
import { Bindings } from "../../../types";
import {
  getUserWatchlistsHandler,
  createWatchlistHandler,
  getWatchlistHandler,
  updateWatchlistHandler,
  deleteWatchlistHandler
} from "../../../handlers/watchlists";
import { verifyToken } from "../../../middlewares/verifyToken";

export const watchlistsRouter = new Hono<{ Bindings: Bindings }>();

// Get all user watchlists
watchlistsRouter.get('/', verifyToken, ...getUserWatchlistsHandler);

// Create new watchlist
watchlistsRouter.post('/', verifyToken, ...createWatchlistHandler);

// Get specific watchlist
watchlistsRouter.get('/:id', verifyToken, ...getWatchlistHandler);

// Update watchlist
watchlistsRouter.put('/:id', verifyToken, ...updateWatchlistHandler);

// Delete watchlist
watchlistsRouter.delete('/:id', verifyToken, ...deleteWatchlistHandler);
