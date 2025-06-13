import { Context } from "hono";
import { createFactory } from "hono/factory";
import { getPrisma } from "../lib/prisma";
import { Watchlist } from "@prisma/client";

const factory = createFactory();

// Get all user watchlists
export const getUserWatchlistsHandler = factory.createHandlers(async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);
    const watchlists = await prisma.watchlist.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

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

    return c.json({ success: true, watchlist }, 201);
  } catch (error) {
    console.error("Failed to create watchlist:", error);
    return c.json(
      { success: false, error: "Failed to create watchlist" },
      500
    );
  }
});

// Get specific watchlist
export const getWatchlistHandler = factory.createHandlers(async (c: Context) => {
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
    const watchlist = await prisma.watchlist.findUnique({
      where: {
        id: watchlistId,
      },
      include: {
        WatchlistItem: true,
      },
    });

    if (!watchlist) {
      return c.json({ success: false, error: "Watchlist not found" }, 404);
    }

    if (watchlist.ownerId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    return c.json({ success: true, watchlist });
  } catch (error) {
    console.error("Failed to get watchlist:", error);
    return c.json(
      { success: false, error: "Failed to get watchlist" },
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
