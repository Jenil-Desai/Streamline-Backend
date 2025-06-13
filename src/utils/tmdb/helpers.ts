import { TMDBMovieItem, TMDBTVItem, MediaItem } from "../../types";

/**
 * Helper function to convert TMDB movie data to MediaItem format
 * @param movie TMDB movie item
 * @returns Standardized MediaItem format
 */
export const mapMovieToMediaItem = (movie: TMDBMovieItem): MediaItem => ({
  id: movie.id,
  title: movie.original_title,
  poster_path: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
  release_date: movie.release_date,
  media_type: 'movie'
});

/**
 * Helper function to convert TMDB TV data to MediaItem format
 * @param tv TMDB TV item
 * @returns Standardized MediaItem format
 */
export const mapTVToMediaItem = (tv: TMDBTVItem): MediaItem => ({
  id: tv.id,
  title: tv.original_name,
  poster_path: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : null,
  release_date: tv.first_air_date,
  media_type: 'tv'
});

/**
 * Get TMDB API request options with proper authorization
 * @param apiKey TMDB API key
 * @returns Request options object
 */
export const getTMDBOptions = (apiKey: string): RequestInit => ({
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${apiKey}`
  }
});

/**
 * Fetch data from TMDB API with error handling
 * @param url TMDB API endpoint URL
 * @param options Request options
 * @returns API response data or null if an error occurs
 */
export async function fetchTMDBData<T>(url: string, options: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      console.error(`TMDB API error: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json() as T;
  } catch (error) {
    console.error('Error fetching TMDB data:', error);
    return null;
  }
}

/**
 * Base TMDB API endpoints without page parameter
 */
export const TMDB_BASE_ENDPOINTS = {
  trending_movies: 'https://api.themoviedb.org/3/trending/movie/day?language=en-US',
  trending_tv: 'https://api.themoviedb.org/3/trending/tv/day?language=en-US',
  popular_movies: 'https://api.themoviedb.org/3/movie/popular?language=en-US',
  popular_tv: 'https://api.themoviedb.org/3/tv/popular?language=en-US',
  upcoming_movies: 'https://api.themoviedb.org/3/movie/upcoming?language=en-US',
  on_air_tv: 'https://api.themoviedb.org/3/tv/on_the_air?language=en-US',
  top_rated_movies: 'https://api.themoviedb.org/3/movie/top_rated?language=en-US',
  top_rated_tv: 'https://api.themoviedb.org/3/tv/top_rated?language=en-US'
};

/**
 * Get TMDB API URL with page parameter
 * @param baseEndpoint Base endpoint URL without page parameter
 * @param page Page number (defaults to 1)
 * @returns URL with page parameter
 */
export function getTMDBEndpointWithPage(baseEndpoint: string, page: number = 1): string {
  return `${baseEndpoint}&page=${page}`;
}
