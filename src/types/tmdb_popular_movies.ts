import { ApiResponse } from "./tmdb_api_response";

export interface PopularMovieResult extends ApiResponse {
  results: {
    adult: boolean; // Defaults to true
    backdrop_path: string;
    genre_ids: number[];
    id: number; // Defaults to 0
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number; // Defaults to 0
    poster_path: string;
    release_date: string;
    title: string;
    video: boolean; // Defaults to true
    vote_average: number; // Defaults to 0
    vote_count: number;
  }[]
}
