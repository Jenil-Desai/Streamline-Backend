import { Hono } from "hono";
import { Bindings } from "../../../types";
import {
  movieDetailsHandler,
  tvDetailsHandler,
  multiSearchHandler
} from "../../../handlers/search";

export const searchRouter = new Hono<{ Bindings: Bindings }>();

// Multi search route - searches for both movies and TV shows
// Compatible with debounce, pagination, and filters
// Query parameters:
// - query: search query (required)
// - page: page number (optional, defaults to 1)
// - include_adult: include adult content (optional, defaults to false)
// - language: language code (optional, defaults to en-US)
// - media_type: filter by media type (optional, 'movie' or 'tv')
searchRouter.get('/', multiSearchHandler);

// Movie details route - returns all information about a specific movie
searchRouter.get('/movie/:tmdbId', movieDetailsHandler);

// TV show details route - returns all information about a specific TV show including seasons and episodes
searchRouter.get('/tv/:tmdbId', tvDetailsHandler);
