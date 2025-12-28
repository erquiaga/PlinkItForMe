import { useState } from 'react';
import './App.css';
import { Input, Alert, Select } from 'antd';
import { scrapeUserMovies, type MovieData } from './api/Api';
import Plinko from './components/Plinko';
import LoadingSpinner from './components/LoadingSpinner';
import { Genre, Decade } from './constants/LetterboxdFilters';

const { Search } = Input;

function App() {
  const [movieData, setMovieData] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>(
    undefined
  );
  const [selectedDecade, setSelectedDecade] = useState<string | undefined>(
    undefined
  );
  const [showAdvancedOptions, setShowAdvancedOptions] =
    useState<boolean>(false);

  const handleReset = () => {
    setMovieData(null);
    setLoading(false);
    setError(null);
    setUsername('');
    setSelectedGenre(undefined);
    setSelectedDecade(undefined);
  };

  const onSearch = async (searchUsername: string): Promise<void> => {
    if (!searchUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError(null);
    setMovieData(null);

    console.log('Searching with filters:', {
      username: searchUsername.trim(),
      genre: selectedGenre,
      decade: selectedDecade,
    });

    try {
      const result = await scrapeUserMovies(
        searchUsername.trim(),
        selectedGenre,
        selectedDecade
      );
      console.log('Received movies:', result);
      setMovieData(result);
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: { detail?: string };
        };
      };

      const errorDetail = error.response?.data?.detail || '';

      const errorMessages: Record<string, string> = {
        user_not_found: `User "@${searchUsername.trim()}" not found or watchlist is private`,
        no_movies_filters_both: `No movies found with genre "${selectedGenre}" and decade "${selectedDecade}". Try different filters!`,
        no_movies_filter_genre: `No movies found with genre "${selectedGenre}". Try a different genre!`,
        no_movies_filter_decade: `No movies found in decade "${selectedDecade}". Try a different decade!`,
        no_movies: 'Watchlist is empty! Add some movies first.',
      };

      if (errorDetail.startsWith('not_enough_movies:')) {
        const count = errorDetail.split(':')[1];
        setError(
          `Only found ${count} movie(s) with these filters. Need at least 5 movies. Try different filters or add more movies!`
        );
      } else {
        setError(
          errorMessages[errorDetail] ||
            'Failed to fetch movie data. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='app-container'>
      <h1 className='app-title clickable' onClick={handleReset}>
        <span className='title-orange'>PLINK</span>{' '}
        <span className='title-green'>IT FOR</span>{' '}
        <span className='title-blue'>ME</span>
      </h1>

      <p className='app-subtitle'>
        Enter a{' '}
        <a
          href='https://letterboxd.com'
          target='_blank'
          rel='noopener noreferrer'
          className='letterboxd-link'
        >
          Letterboxd
        </a>{' '}
        username, and we will pick a movie for you using{' '}
        <span className='plinko-text'>PLINKO</span>!
      </p>

      <div className='search-container'>
        <Search
          placeholder='enter username'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onSearch={onSearch}
          enterButton
          loading={loading}
          size='large'
        />
      </div>

      <div
        className='advanced-options-toggle'
        onClick={() => {
          if (showAdvancedOptions) {
            setSelectedGenre(undefined);
            setSelectedDecade(undefined);
          }
          setShowAdvancedOptions(!showAdvancedOptions);
        }}
      >
        <span className={`arrow ${showAdvancedOptions ? 'open' : ''}`}>▼</span>
        <span>Advanced Options</span>
      </div>

      {showAdvancedOptions && (
        <div className='filters-container'>
          <Select
            placeholder='Filter by genre'
            allowClear
            size='large'
            style={{ width: 200 }}
            onChange={(value) => setSelectedGenre(value)}
            value={selectedGenre}
          >
            {Object.entries(Genre).map(([key, value]) => (
              <Select.Option
                key={key}
                value={value.toLowerCase().replace(/\s+/g, '-')}
              >
                {value}
              </Select.Option>
            ))}
          </Select>

          <Select
            placeholder='Filter by decade'
            allowClear
            size='large'
            style={{ width: 200 }}
            onChange={(value) => setSelectedDecade(value)}
            value={selectedDecade}
          >
            {Object.entries(Decade).map(([key, value]) => (
              <Select.Option key={key} value={value.toLowerCase()}>
                {value}
              </Select.Option>
            ))}
          </Select>
        </div>
      )}

      {loading && <LoadingSpinner />}

      {error && <Alert type='error' message={error} className='error-alert' />}

      {movieData && movieData.movies.length >= 5 && (
        <Plinko movies={movieData.movies} />
      )}

      <footer className='app-footer'>
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        <a
          href='https://www.themoviedb.org/'
          target='_blank'
          rel='noopener noreferrer'
        >
          <img
            src='https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg'
            alt='TMDB Logo'
            className='tmdb-logo'
          />
        </a>
      </footer>
    </div>
  );
}

export default App;
