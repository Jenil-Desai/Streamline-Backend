import { Context } from "hono";
import { Bindings } from "../types";
import {
  getTMDBOptions,
  fetchTMDBData,
  DEFAULT_CACHE_DURATION,
  getFromCache,
  storeInCache
} from "../utils";

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
