import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

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
  username: string
): Promise<MovieData> => {
  const response = await api.get<MovieData>(`/watchlist/${username}`);
  return response.data;
};
