import re
import json
import asyncio
import aiohttp
import redis
from bs4 import BeautifulSoup
import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Redis runs on localhost:6379 by default
redis_client = redis.Redis(
    host='localhost', 
    port=6379, 
    decode_responses=True
)

# TMDB API configuration for fetching movie posters
TMDB_API_KEY = os.getenv('TMDB_API_KEY')
if not TMDB_API_KEY:
    raise ValueError("TMDB_API_KEY not found in environment variables. Please check your .env file.")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

# Cache expiration time (6 hours = 21600 seconds)
# After this time, we'll scrape fresh data
CACHE_EXPIRATION = 21600

# ==============================================================================
# ASYNC PAGE SCRAPING
# ==============================================================================

async def fetch_page(session, username, page):
    """
    Asynchronously fetch and parse a single page of a user's watchlist.
    
    Args:
        session: aiohttp ClientSession for making HTTP requests
        username: Letterboxd username
        page: Page number to fetch (1, 2, 3, etc.)
    
    Returns:
        List of movie dictionaries from this page, or empty list if page doesn't exist
    """
    url = f"https://letterboxd.com/{username}/watchlist/page/{page}/"
    
    # This prevents Letterboxd from blocking us
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        async with session.get(url, headers=headers) as response:
            # If page doesn't exist (404) or error, return empty list
            if response.status != 200:
                return []
            
            html = await response.text()
            
            soup = BeautifulSoup(html, 'html.parser')
            
            # Find all movie items on the page
            watchlist_movies = soup.find_all('li', class_='griditem')
            
            # If no movies found, we've reached the end of the watchlist
            if not watchlist_movies:
                return []
            
            movies = []
            
            # Extract data from each movie
            for movie in watchlist_movies:
                # Find the div that contains movie data
                poster_div = movie.find('div', class_='react-component')
                
                if poster_div:
                    full_name = poster_div.get('data-item-name')
                    
                    slug = poster_div.get('data-item-slug')
                    movie_url = f"https://letterboxd.com/film/{slug}/" if slug else None
                    
                    # Extract year using regex: finds (YYYY) at end of string
                    # Example: "Inception (2010)" -> extracts "2010"
                    year_match = re.search(r'\((\d{4})\)$', full_name)
                    year = int(year_match.group(1)) if year_match else None
                    
                    # Remove the year from title: "Inception (2010)" -> "Inception"
                    title = re.sub(r'\s*\(\d{4}\)$', '', full_name) if year_match else full_name
                    
                    # Add movie to our list
                    # Note: poster is None here - we'll fetch it later only for selected movies
                    movies.append({
                        "title": title,
                        "year": year,
                        "url": movie_url,
                        "poster": None
                    })
            
            return movies
            
    except Exception as e:
        # If anything goes wrong (network error, etc.), print error and return empty
        print(f"Error fetching page {page} for {username}: {e}")
        return []


async def scrape_watchlist_async(username):
    """
    Scrape ALL pages of a user's watchlist in parallel using async/await.
    
    This is much faster than scraping pages one-by-one because we don't wait
    for page 1 to finish before starting page 2. All pages load simultaneously!
    
    Args:
        username: Letterboxd username
    
    Returns:
        List of all movies from watchlist, or None if user doesn't exist
    """
    # Create a session that will be reused for all requests
    async with aiohttp.ClientSession() as session:
        # Fetch page 1 to check if user exists
        page_1_movies = await fetch_page(session, username, 1)
        
        # If page 1 is empty, user doesn't exist or watchlist is private
        if not page_1_movies:
            return None
        
        # Scrape pages 2-20 in parallel
        # Why 20? Most watchlists are under 560 movies (20 pages × 28 movies/page)
        tasks = [
            fetch_page(session, username, page) 
            for page in range(2, 21)  # Pages 2 through 20
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Start with movies from page 1
        all_movies = page_1_movies
        
        # Add movies from all other pages
        for movies in results:
            if movies:
                all_movies.extend(movies)
        
        print(f"Scraped {len(all_movies)} movies for {username}")
        return all_movies


def get_watchlist_movies(username):
    """
    Main function to get a user's watchlist movies.
    
    This function:
    1. Checks Redis cache first (instant if cached)
    2. If not cached, scrapes Letterboxd asynchronously (fast)
    3. Stores result in cache for 6 hours
    
    Args:
        username: Letterboxd username
    
    Returns:
        List of movie dictionaries, or None if user doesn't exist
    """
    # STEP 1: Check if we have cached data for this user
    cache_key = f"watchlist:{username}"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        # Cache hit! Return the cached data instantly
        print(f"✓ Cache hit for {username} - returning cached data")
        return json.loads(cached_data)
    
    # STEP 2: Cache miss - we need to scrape Letterboxd
    print(f"✗ Cache miss for {username} - scraping Letterboxd...")
    
    movies = asyncio.run(scrape_watchlist_async(username))
    
    # If scraping failed (user doesn't exist), return None
    if movies is None:
        return None
    
    # STEP 3: Store in cache for next time
    # Stores the data and automatically deletes it after CACHE_EXPIRATION seconds
    redis_client.setex(
        cache_key,
        CACHE_EXPIRATION,  # 6 hours
        json.dumps(movies) 
    )
    
    print(f"✓ Cached {len(movies)} movies for {username}")
    return movies


# ==============================================================================
# TMDB POSTER FETCHING
# ==============================================================================

def get_movie_data(movie_title, movie_year):
    """
    Fetch movie poster URL from TMDB API.
    
    This is still synchronous (not async) because we only call it for 5 movies,
    so the performance impact is minimal.
    
    Args:
        movie_title: Movie title (e.g., "Inception")
        movie_year: Release year (e.g., 2010)
    
    Returns:
        Full poster URL string, or None if not found
    """
    url = f'{TMDB_BASE_URL}/search/movie'
    params = {
        'api_key': TMDB_API_KEY,
        'query': movie_title,
        'primary_release_year': movie_year
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        # Get the results list (might be empty if movie not found)
        results = data.get('results', [])
        
        if results:
            # Get poster_path from first result
            poster_path = results[0].get('poster_path')
            
            if poster_path:
                # Build full poster URL
                # TMDB gives us "/abc123.jpg", we need to add the base URL
                return f"{TMDB_IMAGE_BASE_URL}{poster_path}"
        
        return None
        
    except Exception as e:
        print(f"Error fetching TMDB data for {movie_title}: {e}")
        return None