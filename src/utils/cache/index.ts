import { KVNamespace } from '@cloudflare/workers-types';

/**
 * Default cache duration in seconds (10 minutes)
 */
export const DEFAULT_CACHE_DURATION = 600;

/**
 * Generic interface for cached data
 */
export interface CacheItem<T> {
  timestamp: number; // Unix timestamp when the data was cached
  data: T;          // The cached data
}

/**
 * Get data from cache if it exists and is not expired
 * @param kv KVNamespace instance
 * @param key Cache key
 * @param cacheDuration Cache duration in seconds
 * @returns The cached data if valid, null otherwise
 */
export async function getFromCache<T>(
  kv: KVNamespace,
  key: string,
  cacheDuration = DEFAULT_CACHE_DURATION
): Promise<T | null> {
  try {
    const cachedItem = await kv.get<CacheItem<T>>(key, { type: "json" });
    if (!cachedItem) return null;

    // Check if cache is still valid
    const now = Math.floor(Date.now() / 1000);
    if (now - cachedItem.timestamp < cacheDuration) {
      return cachedItem.data;
    }

    return null; // Cache expired
  } catch (error) {
    console.error(`Error getting data from cache (${key}):`, error);
    return null;
  }
}

/**
 * Store data in cache
 * @param kv KVNamespace instance
 * @param key Cache key
 * @param data Data to cache
 * @param cacheDuration Cache duration in seconds
 * @returns Promise that resolves when data is stored
 */
export async function storeInCache<T>(
  kv: KVNamespace,
  key: string,
  data: T,
  cacheDuration = DEFAULT_CACHE_DURATION
): Promise<void> {
  try {
    const cacheItem: CacheItem<T> = {
      timestamp: Math.floor(Date.now() / 1000),
      data
    };

    // Set expiration to twice the cache duration as a safety buffer
    await kv.put(key, JSON.stringify(cacheItem), {
      expirationTtl: cacheDuration * 2
    });
  } catch (error) {
    console.error(`Error storing data in cache (${key}):`, error);
  }
}
