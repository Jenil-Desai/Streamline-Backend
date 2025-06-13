export interface ApiResponse {
  page: number; // Defaults to 0
  total_pages: number; // Defaults to 0
  total_results: number; // Defaults to 0
}

export interface TMDBMovieItem {
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface TMDBTVItem {
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  id: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  first_air_date: string;
  name: string;
  vote_average: number;
  vote_count: number;
}

export interface TMDBMovieResponse extends ApiResponse {
  results: TMDBMovieItem[];
}

export interface TMDBTVResponse extends ApiResponse {
  results: TMDBTVItem[];
}
