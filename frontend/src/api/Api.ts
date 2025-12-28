import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Movie {
  title: string;
  year?: number;
  url?: string;
  poster?: string;
}

export interface MovieData {
  username: string;
  count: number;
  selected_count: number;
  movies: Movie[];
}

export const scrapeUserMovies = async (
  username: string,
  genre?: string,
  decade?: string
): Promise<MovieData> => {
  const params: Record<string, string> = {};
  if (genre) params.genre = genre;
  if (decade) params.decade = decade;

  const response = await axios.get(`${API_BASE_URL}/watchlist/${username}`, {
    params,
  });
  return response.data;
};
