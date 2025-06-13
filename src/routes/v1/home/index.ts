import { Hono } from "hono";
import { Bindings } from "../../../types";
import {
  homeHandler,
  trendingMoviesHandler,
  trendingTVHandler,
  popularMoviesHandler,
  popularTVHandler,
  upcomingMoviesHandler,
  onAirTVHandler,
  topRatedMoviesHandler,
  topRatedTVHandler
} from "../../../handlers/home";
import { verifyToken } from "../../../middlewares/verifyToken";

export const homeRouter = new Hono<{ Bindings: Bindings }>();

// Main home page endpoint - returns first page of all categories
homeRouter.get("/", verifyToken, ...homeHandler);

// Category-specific endpoints with pagination support
homeRouter.get("/trending/movies", verifyToken, ...trendingMoviesHandler);
homeRouter.get("/trending/tv", verifyToken, ...trendingTVHandler);
homeRouter.get("/popular/movies", verifyToken, ...popularMoviesHandler);
homeRouter.get("/popular/tv", verifyToken, ...popularTVHandler);
homeRouter.get("/upcoming/movies", verifyToken, ...upcomingMoviesHandler);
homeRouter.get("/on-air/tv", verifyToken, ...onAirTVHandler);
homeRouter.get("/top-rated/movies", verifyToken, ...topRatedMoviesHandler);
homeRouter.get("/top-rated/tv", verifyToken, ...topRatedTVHandler);
