import { MediaItem } from "../../types";
import { fetchTMDBData, getTMDBOptions } from "../tmdb/helpers";
import { KVNamespace } from "@cloudflare/workers-types";
import { DEFAULT_CACHE_DURATION, getFromCache, storeInCache } from "../cache";

/**
 * Get watchlist items cache key
 * @param watchlistId Watchlist ID
 * @returns Cache key for watchlist items
 */
export const getWatchlistItemsCacheKey = (watchlistId: string): string => {
  return `watchlist_items_${watchlistId}`;
};

/**
 * Get media item cache key
 * @param mediaType Media type (movie or tv)
 * @param tmdbId TMDB ID
 * @returns Cache key for media item
 */
export const getMediaItemCacheKey = (mediaType: string, tmdbId: number): string => {
  return `media_${mediaType.toLowerCase()}_${tmdbId}`;
};

/**
 * Get cache key for a watchlist
 * @param watchlistId Watchlist ID
 * @returns Cache key for watchlist
 */
export const getWatchlistCacheKey = (watchlistId: string): string => {
  return `watchlist_${watchlistId}`;
};

/**
 * Get cache key for user's watchlists
 * @param userId User ID
 * @returns Cache key for user's watchlists
 */
export const getUserWatchlistsCacheKey = (userId: string): string => {
  return `user_watchlists_${userId}`;
};

/**
 * Invalidate watchlist-related caches when a watchlist is modified
 * @param cache KV cache namespace
 * @param watchlistId Watchlist ID
 * @param userId User ID
 */
export const invalidateWatchlistCaches = async (
  cache: KVNamespace,
  watchlistId: string,
  userId: string
): Promise<void> => {
  // Delete watchlist items cache
  await cache.delete(getWatchlistItemsCacheKey(watchlistId));

  // Delete watchlist cache
  await cache.delete(getWatchlistCacheKey(watchlistId));

  // Delete user's watchlists cache
  await cache.delete(getUserWatchlistsCacheKey(userId));
};

/**
 * Fetch movie details from TMDB
 * @param movieId TMDB Movie ID
 * @param apiKey TMDB API Key
 * @returns MediaItem or null if fetch fails
 */
export const fetchMovieDetails = async (movieId: number, apiKey: string): Promise<MediaItem | null> => {
  const endpoint = `https://api.themoviedb.org/3/movie/${movieId}?language=en-US`;
  const options = getTMDBOptions(apiKey);

  const movieData = await fetchTMDBData<any>(endpoint, options);
  if (!movieData) return null;

  return {
    id: movieData.id,
    title: movieData.original_title || movieData.title,
    poster_path: movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : null,
    release_date: movieData.release_date || '',
    media_type: 'movie'
  };
};

/**
 * Fetch TV show details from TMDB
 * @param tvId TMDB TV ID
 * @param apiKey TMDB API Key
 * @returns MediaItem or null if fetch fails
 */
export const fetchTVDetails = async (tvId: number, apiKey: string): Promise<MediaItem | null> => {
  const endpoint = `https://api.themoviedb.org/3/tv/${tvId}?language=en-US`;
  const options = getTMDBOptions(apiKey);

  const tvData = await fetchTMDBData<any>(endpoint, options);
  if (!tvData) return null;

  return {
    id: tvData.id,
    title: tvData.original_name || tvData.name,
    poster_path: tvData.poster_path ? `https://image.tmdb.org/t/p/w500${tvData.poster_path}` : null,
    release_date: tvData.first_air_date || '',
    media_type: 'tv'
  };
};

/**
 * Get media details with caching
 * @param mediaType Media type (MOVIE or TV)
 * @param tmdbId TMDB ID
 * @param apiKey TMDB API Key
 * @param cache KV cache namespace
 * @returns MediaItem or null if fetch fails
 */
export const getMediaDetailsWithCache = async (
  mediaType: string,
  tmdbId: number,
  apiKey: string,
  cache: KVNamespace
): Promise<MediaItem | null> => {
  // Try to get from cache first
  const cacheKey = getMediaItemCacheKey(mediaType, tmdbId);
  const cachedData = await getFromCache<MediaItem>(cache, cacheKey, DEFAULT_CACHE_DURATION);

  if (cachedData) {
    return cachedData;
  }

  // If not in cache, fetch from API
  let mediaDetails: MediaItem | null = null;

  if (mediaType.toUpperCase() === "MOVIE") {
    mediaDetails = await fetchMovieDetails(tmdbId, apiKey);
  } else if (mediaType.toUpperCase() === "TV") {
    mediaDetails = await fetchTVDetails(tmdbId, apiKey);
  }

  // Store in cache if fetch was successful
  if (mediaDetails) {
    await storeInCache(cache, cacheKey, mediaDetails, DEFAULT_CACHE_DURATION);
  }

  return mediaDetails;
};
