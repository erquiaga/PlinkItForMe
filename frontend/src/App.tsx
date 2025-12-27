import { useState } from 'react';
import './App.css';
import { Input, Alert } from 'antd';
import { scrapeUserMovies, type MovieData } from './api/Api';
import Plinko from './components/Plinko';
import LoadingSpinner from './components/LoadingSpinner';

const { Search } = Input;

function App() {
  const [movieData, setMovieData] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async (username: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setMovieData(null);

    try {
      const result = await scrapeUserMovies(username);
      setMovieData(result);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('User not found or watchlist is private');
      } else {
        setError('Failed to fetch movie data');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='app-container'>
      <h1 className='app-title'>
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
        <span className='plinko-text'>PLINKO</span>
        <span className='exclamation'>!</span>
      </p>

      <div className='search-container'>
        <Search
          placeholder='enter username'
          onSearch={onSearch}
          enterButton
          loading={loading}
          size='large'
        />
      </div>

      {loading && <LoadingSpinner />}

      {error && <Alert type='error' title={error} className='error-alert' />}

      {movieData && <Plinko movies={movieData.movies} />}
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
