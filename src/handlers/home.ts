import { Context } from "hono";
import { createFactory } from "hono/factory";
import {
  TMDBMovieResponse,
  TMDBTVResponse,
  HomeResponse,
  PaginatedMediaItems,
  getPageCacheKey,
} from "../types";
import {
  mapMovieToMediaItem,
  mapTVToMediaItem,
  getTMDBOptions,
  fetchTMDBData,
  TMDB_BASE_ENDPOINTS,
  getTMDBEndpointWithPage,
  DEFAULT_CACHE_DURATION,
  getFromCache,
  storeInCache
} from "../utils";

const factory = createFactory();

// Handler for home page - returns first page of all categories
export const homeHandler = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "Unauthorized" }, 400);
  }

  const cacheKey = "home_data";
  const cachedData = await getFromCache<HomeResponse>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
  if (cachedData) {
    return c.json(cachedData);
  }

  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);

  // Fetch data from all endpoints in parallel
  const [
    trendingMoviesData,
    trendingTVData,
    popularMoviesData,
    popularTVData,
    upcomingMoviesData,
    onAirTVData,
    topRatedMoviesData,
    topRatedTVData
  ] = await Promise.all([
    fetchTMDBData<TMDBMovieResponse>(getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.trending_movies, 1), options),
    fetchTMDBData<TMDBTVResponse>(getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.trending_tv, 1), options),
    fetchTMDBData<TMDBMovieResponse>(getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.popular_movies, 1), options),
    fetchTMDBData<TMDBTVResponse>(getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.popular_tv, 1), options),
    fetchTMDBData<TMDBMovieResponse>(getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.upcoming_movies, 1), options),
    fetchTMDBData<TMDBTVResponse>(getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.on_air_tv, 1), options),
    fetchTMDBData<TMDBMovieResponse>(getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.top_rated_movies, 1), options),
    fetchTMDBData<TMDBTVResponse>(getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.top_rated_tv, 1), options)
  ]);

  // Prepare response with all data
  const responseData: HomeResponse = {
    trending_movies: trendingMoviesData?.results ? trendingMoviesData.results.map(mapMovieToMediaItem) : [],
    trending_tv: trendingTVData?.results ? trendingTVData.results.map(mapTVToMediaItem) : [],
    popular_movies: popularMoviesData?.results ? popularMoviesData.results.map(mapMovieToMediaItem) : [],
    popular_tv: popularTVData?.results ? popularTVData.results.map(mapTVToMediaItem) : [],
    upcoming_movies: upcomingMoviesData?.results ? upcomingMoviesData.results.map(mapMovieToMediaItem) : [],
    on_air_tv: onAirTVData?.results ? onAirTVData.results.map(mapTVToMediaItem) : [],
    top_rated_movies: topRatedMoviesData?.results ? topRatedMoviesData.results.map(mapMovieToMediaItem) : [],
    top_rated_tv: topRatedTVData?.results ? topRatedTVData.results.map(mapTVToMediaItem) : []
  };

  // Store in cache for future requests
  await storeInCache(c.env.SL_CACHE, cacheKey, responseData, DEFAULT_CACHE_DURATION);

  return c.json(responseData);
});

// Trending Movies handler with pagination
export const trendingMoviesHandler = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "Unauthorized" }, 400);
  }

  const page = parseInt(c.req.query('page') || '1', 10);
  if (isNaN(page) || page < 1) {
    return c.json({ success: false, error: "Invalid page parameter" }, 400);
  }

  // Try to get data from cache first
  const cacheKey = getPageCacheKey('trending_movies', page);
  const cachedData = await getFromCache<PaginatedMediaItems>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
  if (cachedData) {
    return c.json(cachedData);
  }

  // Cache miss or expired, fetch fresh data
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);
  const endpoint = getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.trending_movies, page);

  const data = await fetchTMDBData<TMDBMovieResponse>(endpoint, options);
  if (!data) {
    return c.json({ success: false, error: "Failed to fetch trending movies" }, 500);
  }

  // Prepare response
  const responseData: PaginatedMediaItems = {
    results: data.results.map(mapMovieToMediaItem),
    pagination: {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    }
  };

  // Store in cache for future requests
  await storeInCache(c.env.SL_CACHE, cacheKey, responseData, DEFAULT_CACHE_DURATION);

  return c.json(responseData);
});

// Trending TV handler with pagination
export const trendingTVHandler = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "Unauthorized" }, 400);
  }

  // Get page parameter from query string (default to 1)
  const page = parseInt(c.req.query('page') || '1', 10);
  if (isNaN(page) || page < 1) {
    return c.json({ success: false, error: "Invalid page parameter" }, 400);
  }

  // Try to get data from cache first
  const cacheKey = getPageCacheKey('trending_tv', page);
  const cachedData = await getFromCache<PaginatedMediaItems>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
  if (cachedData) {
    return c.json(cachedData);
  }

  // Cache miss or expired, fetch fresh data
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);
  const endpoint = getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.trending_tv, page);

  const data = await fetchTMDBData<TMDBTVResponse>(endpoint, options);
  if (!data) {
    return c.json({ success: false, error: "Failed to fetch trending TV shows" }, 500);
  }

  // Prepare response
  const responseData: PaginatedMediaItems = {
    results: data.results.map(mapTVToMediaItem),
    pagination: {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    }
  };

  // Store in cache for future requests
  await storeInCache(c.env.SL_CACHE, cacheKey, responseData, DEFAULT_CACHE_DURATION);

  return c.json(responseData);
});

// Popular Movies handler with pagination
export const popularMoviesHandler = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "Unauthorized" }, 400);
  }

  // Get page parameter from query string (default to 1)
  const page = parseInt(c.req.query('page') || '1', 10);
  if (isNaN(page) || page < 1) {
    return c.json({ success: false, error: "Invalid page parameter" }, 400);
  }

  // Try to get data from cache first
  const cacheKey = getPageCacheKey('popular_movies', page);
  const cachedData = await getFromCache<PaginatedMediaItems>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
  if (cachedData) {
    return c.json(cachedData);
  }

  // Cache miss or expired, fetch fresh data
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);
  const endpoint = getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.popular_movies, page);

  const data = await fetchTMDBData<TMDBMovieResponse>(endpoint, options);
  if (!data) {
    return c.json({ success: false, error: "Failed to fetch popular movies" }, 500);
  }

  // Prepare response
  const responseData: PaginatedMediaItems = {
    results: data.results.map(mapMovieToMediaItem),
    pagination: {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    }
  };

  // Store in cache for future requests
  await storeInCache(c.env.SL_CACHE, cacheKey, responseData, DEFAULT_CACHE_DURATION);

  return c.json(responseData);
});

// Popular TV handler with pagination
export const popularTVHandler = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "Unauthorized" }, 400);
  }

  // Get page parameter from query string (default to 1)
  const page = parseInt(c.req.query('page') || '1', 10);
  if (isNaN(page) || page < 1) {
    return c.json({ success: false, error: "Invalid page parameter" }, 400);
  }

  // Try to get data from cache first
  const cacheKey = getPageCacheKey('popular_tv', page);
  const cachedData = await getFromCache<PaginatedMediaItems>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
  if (cachedData) {
    return c.json(cachedData);
  }

  // Cache miss or expired, fetch fresh data
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);
  const endpoint = getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.popular_tv, page);

  const data = await fetchTMDBData<TMDBTVResponse>(endpoint, options);
  if (!data) {
    return c.json({ success: false, error: "Failed to fetch popular TV shows" }, 500);
  }

  // Prepare response
  const responseData: PaginatedMediaItems = {
    results: data.results.map(mapTVToMediaItem),
    pagination: {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    }
  };

  // Store in cache for future requests
  await storeInCache(c.env.SL_CACHE, cacheKey, responseData, DEFAULT_CACHE_DURATION);

  return c.json(responseData);
});

// Upcoming Movies handler with pagination
export const upcomingMoviesHandler = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "Unauthorized" }, 400);
  }

  // Get page parameter from query string (default to 1)
  const page = parseInt(c.req.query('page') || '1', 10);
  if (isNaN(page) || page < 1) {
    return c.json({ success: false, error: "Invalid page parameter" }, 400);
  }

  // Try to get data from cache first
  const cacheKey = getPageCacheKey('upcoming_movies', page);
  const cachedData = await getFromCache<PaginatedMediaItems>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
  if (cachedData) {
    return c.json(cachedData);
  }

  // Cache miss or expired, fetch fresh data
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);
  const endpoint = getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.upcoming_movies, page);

  const data = await fetchTMDBData<TMDBMovieResponse>(endpoint, options);
  if (!data) {
    return c.json({ success: false, error: "Failed to fetch upcoming movies" }, 500);
  }

  // Prepare response
  const responseData: PaginatedMediaItems = {
    results: data.results.map(mapMovieToMediaItem),
    pagination: {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    }
  };

  // Store in cache for future requests
  await storeInCache(c.env.SL_CACHE, cacheKey, responseData, DEFAULT_CACHE_DURATION);

  return c.json(responseData);
});

// On Air TV handler with pagination
export const onAirTVHandler = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "Unauthorized" }, 400);
  }

  // Get page parameter from query string (default to 1)
  const page = parseInt(c.req.query('page') || '1', 10);
  if (isNaN(page) || page < 1) {
    return c.json({ success: false, error: "Invalid page parameter" }, 400);
  }

  // Try to get data from cache first
  const cacheKey = getPageCacheKey('on_air_tv', page);
  const cachedData = await getFromCache<PaginatedMediaItems>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
  if (cachedData) {
    return c.json(cachedData);
  }

  // Cache miss or expired, fetch fresh data
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);
  const endpoint = getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.on_air_tv, page);

  const data = await fetchTMDBData<TMDBTVResponse>(endpoint, options);
  if (!data) {
    return c.json({ success: false, error: "Failed to fetch on air TV shows" }, 500);
  }

  // Prepare response
  const responseData: PaginatedMediaItems = {
    results: data.results.map(mapTVToMediaItem),
    pagination: {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    }
  };

  // Store in cache for future requests
  await storeInCache(c.env.SL_CACHE, cacheKey, responseData, DEFAULT_CACHE_DURATION);

  return c.json(responseData);
});

// Top Rated Movies handler with pagination
export const topRatedMoviesHandler = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "Unauthorized" }, 400);
  }

  // Get page parameter from query string (default to 1)
  const page = parseInt(c.req.query('page') || '1', 10);
  if (isNaN(page) || page < 1) {
    return c.json({ success: false, error: "Invalid page parameter" }, 400);
  }

  // Try to get data from cache first
  const cacheKey = getPageCacheKey('top_rated_movies', page);
  const cachedData = await getFromCache<PaginatedMediaItems>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
  if (cachedData) {
    return c.json(cachedData);
  }

  // Cache miss or expired, fetch fresh data
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);
  const endpoint = getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.top_rated_movies, page);

  const data = await fetchTMDBData<TMDBMovieResponse>(endpoint, options);
  if (!data) {
    return c.json({ success: false, error: "Failed to fetch top rated movies" }, 500);
  }

  // Prepare response
  const responseData: PaginatedMediaItems = {
    results: data.results.map(mapMovieToMediaItem),
    pagination: {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    }
  };

  // Store in cache for future requests
  await storeInCache(c.env.SL_CACHE, cacheKey, responseData, DEFAULT_CACHE_DURATION);

  return c.json(responseData);
});

// Top Rated TV handler with pagination
export const topRatedTVHandler = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "Unauthorized" }, 400);
  }

  // Get page parameter from query string (default to 1)
  const page = parseInt(c.req.query('page') || '1', 10);
  if (isNaN(page) || page < 1) {
    return c.json({ success: false, error: "Invalid page parameter" }, 400);
  }

  // Try to get data from cache first
  const cacheKey = getPageCacheKey('top_rated_tv', page);
  const cachedData = await getFromCache<PaginatedMediaItems>(c.env.SL_CACHE, cacheKey, DEFAULT_CACHE_DURATION);
  if (cachedData) {
    return c.json(cachedData);
  }

  // Cache miss or expired, fetch fresh data
  const apiKey = c.env.TMDB_API_KEY;
  const options = getTMDBOptions(apiKey);
  const endpoint = getTMDBEndpointWithPage(TMDB_BASE_ENDPOINTS.top_rated_tv, page);

  const data = await fetchTMDBData<TMDBTVResponse>(endpoint, options);
  if (!data) {
    return c.json({ success: false, error: "Failed to fetch top rated TV shows" }, 500);
  }

  // Prepare response
  const responseData: PaginatedMediaItems = {
    results: data.results.map(mapTVToMediaItem),
    pagination: {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    }
  };

  // Store in cache for future requests
  await storeInCache(c.env.SL_CACHE, cacheKey, responseData, DEFAULT_CACHE_DURATION);

  return c.json(responseData);
});
