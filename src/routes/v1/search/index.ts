import { Hono } from "hono";
import { Bindings } from "../../../types";
import {
  movieDetailsHandler,
  tvDetailsHandler
} from "../../../handlers/search";

export const searchRouter = new Hono<{ Bindings: Bindings }>();

// Movie details route - returns all information about a specific movie
searchRouter.get('/movie/:tmdbId', movieDetailsHandler);

// TV show details route - returns all information about a specific TV show including seasons and episodes
searchRouter.get('/tv/:tmdbId', tvDetailsHandler);
