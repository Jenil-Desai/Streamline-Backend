import { Context } from "hono";
import { Bindings } from "../types";
import {
  getTMDBOptions,
  fetchTMDBData,
  DEFAULT_CACHE_DURATION,
  getFromCache,
  storeInCache,
  mapMovieToMediaItem,
  mapTVToMediaItem
} from "../utils";
import { MediaItem, TMDBMovieItem, TMDBTVItem } from "../types";

// Types for search results
interface SearchResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: MediaItem[];
}

interface TMDBMultiSearchResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
}

interface TMDBMultiSearchResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: TMDBMultiSearchResult[];
}

/**
 * Multi search handler - searches for both movies and TV shows
 * Supports debounce on the frontend by accepting a query parameter
 */
export const multiSearchHandler = async (c: Context<{ Bindings: Bindings }>) => {
  // Extract query parameters
  const query = c.req.query('query');
  const page = parseInt(c.req.query('page') || '1', 10);
  const includeAdult = c.req.query('include_adult') === 'true';
  const language = c.req.query('language') || 'en-US';
  const mediaType = c.req.query('media_type'); // Optional filter: 'movie', 'tv', or undefined for both

  // Validate required parameters
  if (!query || query.trim().length === 0) {
    return c.json(
      { success: false, error: "Search query is required" },
      400
    );
  }

  // Check cache first
  // Include all parameters in the cache key to ensure correct caching
  const cacheKey = `search_${query}_${page}_${includeAdult}_${language}_${mediaType || 'all'}`;
  const cachedData = await getFromCache<SearchResponse>(c.env.SL_CACHE, cacheKey);

  if (cachedData) {
    return c.json({ success: true, data: cachedData });
  }

  // Cache miss - fetch from TMDB API
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);

  try {
    let endpoint;
    let results: MediaItem[] = [];

    // If mediaType is specified, use the specific endpoint
    if (mediaType === 'movie') {
      endpoint = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=${includeAdult}&language=${language}&page=${page}`;
      const response = await fetchTMDBData<{ results: TMDBMovieItem[] } & { page: number, total_pages: number, total_results: number }>(endpoint, options);

      if (response) {
        results = response.results.map(item => mapMovieToMediaItem(item));

        const searchResponse: SearchResponse = {
          page: response.page,
          total_pages: response.total_pages,
          total_results: response.total_results,
          results
        };

        // Cache the response
        await storeInCache(c.env.SL_CACHE, cacheKey, searchResponse, DEFAULT_CACHE_DURATION);

        return c.json({ success: true, data: searchResponse });
      }
    } else if (mediaType === 'tv') {
      endpoint = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&include_adult=${includeAdult}&language=${language}&page=${page}`;
      const response = await fetchTMDBData<{ results: TMDBTVItem[] } & { page: number, total_pages: number, total_results: number }>(endpoint, options);

      if (response) {
        results = response.results.map(item => mapTVToMediaItem(item));

        const searchResponse: SearchResponse = {
          page: response.page,
          total_pages: response.total_pages,
          total_results: response.total_results,
          results
        };

        // Cache the response
        await storeInCache(c.env.SL_CACHE, cacheKey, searchResponse, DEFAULT_CACHE_DURATION);

        return c.json({ success: true, data: searchResponse });
      }
    } else {
      // Use multi search to get both movies and TV shows
      endpoint = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=${includeAdult}&language=${language}&page=${page}`;
      const response = await fetchTMDBData<TMDBMultiSearchResponse>(endpoint, options);

      if (response) {
        // Filter out results that are not movies or TV shows
        results = response.results
          .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
          .map(item => {
            if (item.media_type === 'movie') {
              return {
                id: item.id,
                title: item.title || item.original_title || '',
                poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                release_date: item.release_date || '',
                media_type: 'movie' as const
              };
            } else {
              return {
                id: item.id,
                title: item.name || item.original_name || '',
                poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                release_date: item.first_air_date || '',
                media_type: 'tv' as const
              };
            }
          });

        const searchResponse: SearchResponse = {
          page: response.page,
          total_pages: response.total_pages,
          total_results: response.total_results,
          results
        };

        // Cache the response
        await storeInCache(c.env.SL_CACHE, cacheKey, searchResponse, DEFAULT_CACHE_DURATION);

        return c.json({ success: true, data: searchResponse });
      }
    }

    // If we get here, something went wrong with the API call
    return c.json(
      { success: false, error: "Failed to fetch search results" },
      500
    );

  } catch (error) {
    console.error("Error in multi search:", error);
    return c.json(
      { success: false, error: "An error occurred while searching" },
      500
    );
  }
};

// Types for movie details
interface TMDBMovieDetails {
  id: number;
  poster_path: string | null;
  title: string;
  vote_average: number;
  original_language: string;
  runtime: number | null;
  release_date: string;
  status: string;
  overview: string;
  genres: { id: number; name: string }[];
  videos: { results: TMDBVideo[] };
  similar: { results: TMDBSimilarItem[] };
  recommendations: { results: TMDBSimilarItem[] };
  reviews: { results: TMDBReview[] };
}

// Types for TV details
interface TMDBTVDetails {
  id: number;
  poster_path: string | null;
  name: string;
  vote_average: number;
  original_language: string;
  episode_run_time: number[];
  first_air_date: string;
  status: string;
  overview: string;
  genres: { id: number; name: string }[];
  seasons: TMDBTVSeason[];
  videos: { results: TMDBVideo[] };
  similar: { results: TMDBSimilarItem[] };
  recommendations: { results: TMDBSimilarItem[] };
  reviews: { results: TMDBReview[] };
}

// Types for videos
interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

// Types for similar/recommended items
interface TMDBSimilarItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

// Types for reviews
interface TMDBReview {
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
  id: string;
  updated_at: string;
  url: string;
}

// Types for TV seasons
interface TMDBTVSeason {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
}

// Types for TV episodes
interface TMDBEpisode {
  air_date: string;
  episode_number: number;
  id: number;
  name: string;
  overview: string;
  runtime: number | null;
  season_number: number;
  still_path: string | null;
}

// Types for TV season details with episodes
interface TMDBSeasonDetails {
  id: number;
  air_date: string;
  episodes: TMDBEpisode[];
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
}

// Types for watch providers
interface Provider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

interface WatchProviderData {
  link: string;
  buy?: Provider[];
  rent?: Provider[];
  flatrate?: Provider[];
}

interface TMDBWatchProviders {
  results: {
    [country: string]: WatchProviderData;
  };
}

// Composite response type for movie details
interface MovieDetailsResponse {
  details: TMDBMovieDetails;
  watchProviders: {
    [country: string]: WatchProviderData;
  };
}

// Composite response type for TV details
interface TVDetailsResponse {
  details: TMDBTVDetails;
  watchProviders: {
    [country: string]: WatchProviderData;
  };
  seasons: TMDBSeasonDetails[];
}

/**
 * Handler for fetching movie details by TMDB ID
 */
export const movieDetailsHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const tmdbId = c.req.param('tmdbId');

  if (!tmdbId || isNaN(Number(tmdbId))) {
    return c.json(
      { success: false, error: "Invalid TMDB ID" },
      400
    );
  }

  // Check cache first
  const cacheKey = `movie_details_${tmdbId}`;
  const cachedData = await getFromCache<MovieDetailsResponse>(c.env.SL_CACHE, cacheKey);

  if (cachedData) {
    return c.json({ success: true, data: cachedData });
  }

  // Cache miss - fetch from TMDB API
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);

  // Use append_to_response to get multiple datasets in one request
  const detailsEndpoint = `https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US&append_to_response=videos,similar,recommendations,reviews`;
  const watchProvidersEndpoint = `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers`;

  try {
    // Fetch all data in parallel
    const [details, watchProviders] = await Promise.all([
      fetchTMDBData<TMDBMovieDetails>(detailsEndpoint, options),
      fetchTMDBData<TMDBWatchProviders>(watchProvidersEndpoint, options),
    ]);

    // If any of the essential data is missing, return an error
    if (!details) {
      return c.json(
        { success: false, error: "Failed to fetch movie details" },
        500
      );
    }

    // Compile response with all available data
    const response: MovieDetailsResponse = {
      details,
      watchProviders: watchProviders?.results || {},
    };

    // Cache the response
    await storeInCache(c.env.SL_CACHE, cacheKey, response, DEFAULT_CACHE_DURATION);

    return c.json({ success: true, data: response });

  } catch (error) {
    console.error("Error fetching movie details:", error);
    return c.json(
      { success: false, error: "An error occurred while fetching movie details" },
      500
    );
  }
};

/**
 * Handler for fetching TV show details by TMDB ID
 */
export const tvDetailsHandler = async (c: Context<{ Bindings: Bindings }>) => {
  const tmdbId = c.req.param('tmdbId');

  if (!tmdbId || isNaN(Number(tmdbId))) {
    return c.json(
      { success: false, error: "Invalid TMDB ID" },
      400
    );
  }

  // Check cache first
  const cacheKey = `tv_details_${tmdbId}`;
  const cachedData = await getFromCache<TVDetailsResponse>(c.env.SL_CACHE, cacheKey);

  if (cachedData) {
    return c.json({ success: true, data: cachedData });
  }

  // Cache miss - fetch from TMDB API
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);

  // Use append_to_response to get multiple datasets in one request
  const detailsEndpoint = `https://api.themoviedb.org/3/tv/${tmdbId}?language=en-US&append_to_response=videos,similar,recommendations,reviews`;
  const watchProvidersEndpoint = `https://api.themoviedb.org/3/tv/${tmdbId}/watch/providers`;

  try {
    // Fetch all data in parallel
    const [details, watchProviders] = await Promise.all([
      fetchTMDBData<TMDBTVDetails>(detailsEndpoint, options),
      fetchTMDBData<TMDBWatchProviders>(watchProvidersEndpoint, options),
    ]);

    // If any of the essential data is missing, return an error
    if (!details) {
      return c.json(
        { success: false, error: "Failed to fetch TV show details" },
        500
      );
    }

    // Fetch season details with episodes for each season
    const seasonDetailsPromises = details.seasons.map(season => {
      const seasonEndpoint = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season.season_number}?language=en-US`;
      return fetchTMDBData<TMDBSeasonDetails>(seasonEndpoint, options);
    });

    const seasonDetails = await Promise.all(seasonDetailsPromises);

    // Compile response with all available data
    const response: TVDetailsResponse = {
      details,
      watchProviders: watchProviders?.results || {},
      seasons: seasonDetails.filter(season => season !== null) as TMDBSeasonDetails[]
    };

    // Cache the response
    await storeInCache(c.env.SL_CACHE, cacheKey, response, DEFAULT_CACHE_DURATION);

    return c.json({ success: true, data: response });

  } catch (error) {
    console.error("Error fetching TV show details:", error);
    return c.json(
      { success: false, error: "An error occurred while fetching TV show details" },
      500
    );
  }
};
