// Common media item format for both movies and TV shows
export interface MediaItem {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  media_type: 'movie' | 'tv';
}

// Home endpoint response structure
export interface HomeResponse {
  trending_movies: MediaItem[];
  trending_tv: MediaItem[];
  popular_movies: MediaItem[];
  popular_tv: MediaItem[];
  upcoming_movies: MediaItem[];
  on_air_tv: MediaItem[];
  top_rated_movies: MediaItem[];
  top_rated_tv: MediaItem[];
}

// Pagination metadata
export interface PaginationInfo {
  page: number;
  total_pages: number;
  total_results: number;
}

// Paginated response interface
export interface PaginatedResponse<T> {
  results: T[];
  pagination: PaginationInfo;
}

// Type for paginated media items
export type PaginatedMediaItems = PaginatedResponse<MediaItem>;

// Cache key generator for paginated requests
export function getPageCacheKey(category: string, page: number): string {
  return `${category}_page_${page}`;
}

// Re-export the cache type for backwards compatibility
// The actual implementation uses the generic CacheItem from utils/cache
export type HomeCache = import('../utils/cache').CacheItem<HomeResponse>;
