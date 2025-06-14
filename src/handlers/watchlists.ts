import { Context } from "hono";
import { createFactory } from "hono/factory";
import { getPrisma } from "../lib/prisma";
import { MediaType, WatchStatus, WatchlistItem } from "@prisma/client";
import {
  DEFAULT_CACHE_DURATION,
  getFromCache,
  storeInCache
} from "../utils";
import { MediaItem } from "../types";
import {
  getWatchlistItemsCacheKey,
  getUserWatchlistsCacheKey,
  invalidateWatchlistCaches,
  getMediaDetailsWithCache
} from "../utils/watchlist/helpers";

const factory = createFactory();

// Get all user watchlists
export const getUserWatchlistsHandler = factory.createHandlers(async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  try {
    // Try to get data from cache first
    const cacheKey = getUserWatchlistsCacheKey(userId);
    const cachedData = await getFromCache(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
    if (cachedData) {
      return c.json({ success: true, watchlists: cachedData });
    }

    const prisma = getPrisma(c.env.DATABASE_URL);
    const watchlists = await prisma.watchlist.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        WatchlistItem: true,
      }
    });

    // Store in cache for future requests
    await storeInCache(c.env.SL_CACHE, cacheKey, watchlists, DEFAULT_CACHE_DURATION);

    return c.json({ success: true, watchlists });
  } catch (error) {
    console.error("Failed to get user watchlists:", error);
    return c.json(
      { success: false, error: "Failed to get watchlists" },
      500
    );
  }
});

// Create new watchlist
export const createWatchlistHandler = factory.createHandlers(async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  try {
    const body = await c.req.json();

    if (!body.name || typeof body.name !== "string") {
      return c.json(
        { success: false, error: "Watchlist name is required" },
        400
      );
    }

    const prisma = getPrisma(c.env.DATABASE_URL);
    const watchlist = await prisma.watchlist.create({
      data: {
        name: body.name,
        ownerId: userId,
      },
    });

    // Invalidate user's watchlists cache
    await c.env.SL_CACHE.delete(getUserWatchlistsCacheKey(userId));

    return c.json({ success: true, watchlist }, 201);
  } catch (error) {
    console.error("Failed to create watchlist:", error);
    return c.json(
      { success: false, error: "Failed to create watchlist" },
      500
    );
  }
});

// Update watchlist
export const updateWatchlistHandler = factory.createHandlers(async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  const watchlistId = c.req.param("id");
  if (!watchlistId) {
    return c.json({ success: false, error: "Watchlist ID is required" }, 400);
  }

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);

    // First check if watchlist exists and belongs to user
    const existingWatchlist = await prisma.watchlist.findUnique({
      where: {
        id: watchlistId,
      },
    });

    if (!existingWatchlist) {
      return c.json({ success: false, error: "Watchlist not found" }, 404);
    }

    if (existingWatchlist.ownerId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    const body = await c.req.json();

    if (!body.name || typeof body.name !== "string") {
      return c.json(
        { success: false, error: "Watchlist name is required" },
        400
      );
    }

    const updatedWatchlist = await prisma.watchlist.update({
      where: {
        id: watchlistId,
      },
      data: {
        name: body.name,
      },
    });

    // Invalidate caches
    await invalidateWatchlistCaches(c.env.SL_CACHE, watchlistId, userId);

    return c.json({ success: true, watchlist: updatedWatchlist });
  } catch (error) {
    console.error("Failed to update watchlist:", error);
    return c.json(
      { success: false, error: "Failed to update watchlist" },
      500
    );
  }
});

// Delete watchlist
export const deleteWatchlistHandler = factory.createHandlers(async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  const watchlistId = c.req.param("id");
  if (!watchlistId) {
    return c.json({ success: false, error: "Watchlist ID is required" }, 400);
  }

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);

    // First check if watchlist exists and belongs to user
    const existingWatchlist = await prisma.watchlist.findUnique({
      where: {
        id: watchlistId,
      },
    });

    if (!existingWatchlist) {
      return c.json({ success: false, error: "Watchlist not found" }, 404);
    }

    if (existingWatchlist.ownerId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    // Delete all watchlist items first (cascade delete isn't enabled in the schema)
    await prisma.watchlistItem.deleteMany({
      where: {
        watchlistId,
      },
    });

    // Then delete the watchlist
    await prisma.watchlist.delete({
      where: {
        id: watchlistId,
      },
    });

    // Invalidate caches
    await invalidateWatchlistCaches(c.env.SL_CACHE, watchlistId, userId);

    return c.json({
      success: true,
      message: "Watchlist deleted successfully"
    });
  } catch (error) {
    console.error("Failed to delete watchlist:", error);
    return c.json(
      { success: false, error: "Failed to delete watchlist" },
      500
    );
  }
});

// Interface for watchlist items with media details
interface WatchlistItemWithMedia extends WatchlistItem {
  media_details: MediaItem | null;
}

// Get all items in a watchlist
export const getWatchlistItemsHandler = factory.createHandlers(async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  const watchlistId = c.req.param("id");
  if (!watchlistId) {
    return c.json({ success: false, error: "Watchlist ID is required" }, 400);
  }

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);

    // First check if watchlist exists and belongs to user
    const existingWatchlist = await prisma.watchlist.findUnique({
      where: {
        id: watchlistId,
      },
    });

    if (!existingWatchlist) {
      return c.json({ success: false, error: "Watchlist not found" }, 404);
    }

    if (existingWatchlist.ownerId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    // Try to get the watchlist with media details from cache
    const cacheKey = getWatchlistItemsCacheKey(watchlistId);
    const cachedData = await getFromCache<WatchlistItemWithMedia[]>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);

    if (cachedData) {
      return c.json({ success: true, items: cachedData });
    }

    // Get all items in the watchlist
    const watchlistItems = await prisma.watchlistItem.findMany({
      where: {
        watchlistId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch TMDB data for each item
    const apiKey = c.env.TMDB_API_KEY;
    const itemsWithMediaDetails: WatchlistItemWithMedia[] = await Promise.all(
      watchlistItems.map(async (item) => {
        // Get media details with caching
        const mediaDetails = await getMediaDetailsWithCache(
          item.mediaType,
          item.tmdbId,
          apiKey,
          c.env.SL_CACHE
        );

        // Combine watchlist item data with media details
        return {
          ...item,
          media_details: mediaDetails || null
        };
      })
    );

    // Store the complete data in cache
    await storeInCache(c.env.SL_CACHE, getWatchlistItemsCacheKey(watchlistId), itemsWithMediaDetails, DEFAULT_CACHE_DURATION);

    return c.json({ success: true, items: itemsWithMediaDetails });
  } catch (error) {
    console.error("Failed to get watchlist items:", error);
    return c.json(
      { success: false, error: "Failed to get watchlist items" },
      500
    );
  }
});

// Add item to watchlist
export const addWatchlistItemHandler = factory.createHandlers(async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  const watchlistId = c.req.param("id");
  if (!watchlistId) {
    return c.json({ success: false, error: "Watchlist ID is required" }, 400);
  }

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);

    // First check if watchlist exists and belongs to user
    const existingWatchlist = await prisma.watchlist.findUnique({
      where: {
        id: watchlistId,
      },
    });

    if (!existingWatchlist) {
      return c.json({ success: false, error: "Watchlist not found" }, 404);
    }

    if (existingWatchlist.ownerId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    const body = await c.req.json();

    // Validate required fields
    if (!body.tmdbId || typeof body.tmdbId !== "number") {
      return c.json(
        { success: false, error: "Valid TMDB ID is required" },
        400
      );
    }

    if (!body.mediaType || !["MOVIE", "TV"].includes(body.mediaType)) {
      return c.json(
        { success: false, error: "Valid media type (MOVIE or TV) is required" },
        400
      );
    }

    // Check if item already exists in the watchlist
    try {
      const existingItem = await prisma.watchlistItem.findFirst({
        where: {
          tmdbId: body.tmdbId,
        },
      });

      if (existingItem) {
        return c.json(
          { success: false, error: "This item already exists in a watchlist" },
          400
        );
      }
    } catch (error) {
      // If this check fails, continue with adding the item
      console.error("Error checking for existing item:", error);
    }

    // Create the watchlist item
    const watchlistItem = await prisma.watchlistItem.create({
      data: {
        tmdbId: body.tmdbId,
        mediaType: body.mediaType as MediaType,
        status: (body.status as WatchStatus) || "PLANNED",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        watchlistId,
      },
    });

    // Invalidate caches related to this watchlist
    await invalidateWatchlistCaches(c.env.SL_CACHE, watchlistId, userId);

    return c.json({ success: true, item: watchlistItem }, 201);
  } catch (error) {
    console.error("Failed to add watchlist item:", error);
    return c.json(
      { success: false, error: "Failed to add item to watchlist" },
      500
    );
  }
});

// Update watchlist item
export const updateWatchlistItemHandler = factory.createHandlers(async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  const watchlistId = c.req.param("id");
  const itemId = c.req.param("itemId");

  if (!watchlistId) {
    return c.json({ success: false, error: "Watchlist ID is required" }, 400);
  }

  if (!itemId) {
    return c.json({ success: false, error: "Item ID is required" }, 400);
  }

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);

    // First check if watchlist exists and belongs to user
    const existingWatchlist = await prisma.watchlist.findUnique({
      where: {
        id: watchlistId,
      },
    });

    if (!existingWatchlist) {
      return c.json({ success: false, error: "Watchlist not found" }, 404);
    }

    if (existingWatchlist.ownerId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    // Check if the item exists in this watchlist
    const existingItem = await prisma.watchlistItem.findFirst({
      where: {
        id: itemId,
        watchlistId,
      },
    });

    if (!existingItem) {
      return c.json({ success: false, error: "Item not found in this watchlist" }, 404);
    }

    const body = await c.req.json();

    // Update fields that are provided
    const updateData: any = {};

    if (body.status && ["PLANNED", "WATCHED", "IN_PROGRESS"].includes(body.status)) {
      updateData.status = body.status;
    }

    if (body.scheduledAt !== undefined) {
      updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }

    // If no valid fields to update
    if (Object.keys(updateData).length === 0) {
      return c.json(
        { success: false, error: "No valid fields to update" },
        400
      );
    }

    // Update the item
    const updatedItem = await prisma.watchlistItem.update({
      where: {
        id: itemId,
      },
      data: updateData,
    });

    // Invalidate caches related to this watchlist
    await invalidateWatchlistCaches(c.env.SL_CACHE, watchlistId, userId);

    return c.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("Failed to update watchlist item:", error);
    return c.json(
      { success: false, error: "Failed to update watchlist item" },
      500
    );
  }
});

// Delete watchlist item
export const deleteWatchlistItemHandler = factory.createHandlers(async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  const watchlistId = c.req.param("id");
  const itemId = c.req.param("itemId");

  if (!watchlistId) {
    return c.json({ success: false, error: "Watchlist ID is required" }, 400);
  }

  if (!itemId) {
    return c.json({ success: false, error: "Item ID is required" }, 400);
  }

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);

    // First check if watchlist exists and belongs to user
    const existingWatchlist = await prisma.watchlist.findUnique({
      where: {
        id: watchlistId,
      },
    });

    if (!existingWatchlist) {
      return c.json({ success: false, error: "Watchlist not found" }, 404);
    }

    if (existingWatchlist.ownerId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    // Check if the item exists in this watchlist
    const existingItem = await prisma.watchlistItem.findFirst({
      where: {
        id: itemId,
        watchlistId,
      },
    });

    if (!existingItem) {
      return c.json({ success: false, error: "Item not found in this watchlist" }, 404);
    }

    // Delete the item
    await prisma.watchlistItem.delete({
      where: {
        id: itemId,
      },
    });

    // Invalidate caches related to this watchlist
    await invalidateWatchlistCaches(c.env.SL_CACHE, watchlistId, userId);

    return c.json({
      success: true,
      message: "Item removed from watchlist successfully"
    });
  } catch (error) {
    console.error("Failed to delete watchlist item:", error);
    return c.json(
      { success: false, error: "Failed to remove item from watchlist" },
      500
    );
  }
});
