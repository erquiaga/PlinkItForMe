import re
import json
import asyncio
import aiohttp
import redis
from bs4 import BeautifulSoup
import requests
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
url = urlparse(redis_url)

redis_client = redis.Redis(
    host=url.hostname or 'localhost',
    port=url.port or 6379,
    password=url.password,
    decode_responses=True
)
TMDB_API_KEY = os.getenv('TMDB_API_KEY')
if not TMDB_API_KEY:
    raise ValueError("TMDB_API_KEY not found in environment variables. Please check your .env file.")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

CACHE_EXPIRATION = 21600


async def fetch_page(session, username, page):
    url = f"https://letterboxd.com/{username}/watchlist/page/{page}/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                return []
            
            html = await response.text()
            soup = BeautifulSoup(html, 'html.parser')
            watchlist_movies = soup.find_all('li', class_='griditem')
            
            if not watchlist_movies:
                return []
            
            movies = []
            
            for movie in watchlist_movies:
                poster_div = movie.find('div', class_='react-component')
                
                if poster_div:
                    full_name = poster_div.get('data-item-name')
                    slug = poster_div.get('data-item-slug')
                    movie_url = f"https://letterboxd.com/film/{slug}/" if slug else None
                    
                    year_match = re.search(r'\((\d{4})\)$', full_name)
                    year = int(year_match.group(1)) if year_match else None
                    title = re.sub(r'\s*\(\d{4}\)$', '', full_name) if year_match else full_name
                    
                    movies.append({
                        "title": title,
                        "year": year,
                        "url": movie_url,
                        "poster": None
                    })
            
            return movies
            
    except Exception as e:
        return []


async def scrape_watchlist_async(username, genre=None, decade=None):
    async with aiohttp.ClientSession() as session:
        base_path = f"/{username}/watchlist"
        
        filter_path = ""
        if decade:
            filter_path += f"/decade/{decade}"
        if genre:
            filter_path += f"/genre/{genre}"
        
        async def fetch_filtered_page(session, page):
            url = f"https://letterboxd.com{base_path}{filter_path}/page/{page}/"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            try:
                async with session.get(url, headers=headers) as response:
                    if response.status == 404:
                        return None
                    
                    if response.status != 200:
                        return []
                    
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    watchlist_movies = soup.find_all('li', class_='griditem')
                    
                    if not watchlist_movies:
                        return []
                    
                    movies = []
                    for movie in watchlist_movies:
                        poster_div = movie.find('div', class_='react-component')
                        
                        if poster_div:
                            full_name = poster_div.get('data-item-name')
                            slug = poster_div.get('data-item-slug')
                            movie_url = f"https://letterboxd.com/film/{slug}/" if slug else None
                            
                            year_match = re.search(r'\((\d{4})\)$', full_name)
                            year = int(year_match.group(1)) if year_match else None
                            title = re.sub(r'\s*\(\d{4}\)$', '', full_name) if year_match else full_name
                            
                            movies.append({
                                "title": title,
                                "year": year,
                                "url": movie_url,
                                "poster": None
                            })
                    
                    return movies
                    
            except Exception as e:
                return []
        
        page_1_movies = await fetch_filtered_page(session, 1)
        
        if page_1_movies is None:
            return None
        
        if len(page_1_movies) == 0:
            pass
        
        tasks = [fetch_filtered_page(session, page) for page in range(2, 21)]
        results = await asyncio.gather(*tasks)
        
        all_movies = page_1_movies
        for movies in results:
            if movies:
                all_movies.extend(movies)
        
        return all_movies


def get_watchlist_movies(username, genre=None, decade=None):
    cache_key = f"watchlist:{username}"
    if genre:
        cache_key += f":genre:{genre}"
    if decade:
        cache_key += f":decade:{decade}"
    
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        return json.loads(cached_data)
    
    movies = asyncio.run(scrape_watchlist_async(username, genre=genre, decade=decade))
    
    if movies is None:
        return None
    
    redis_client.setex(
        cache_key,
        CACHE_EXPIRATION,
        json.dumps(movies)
    )
    
    return movies


def get_movie_data(movie_title, movie_year):
    url = f'{TMDB_BASE_URL}/search/movie'
    params = {
        'api_key': TMDB_API_KEY,
        'query': movie_title,
        'primary_release_year': movie_year
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        results = data.get('results', [])
        
        if results:
            poster_path = results[0].get('poster_path')
            
            if poster_path:
                return f"{TMDB_IMAGE_BASE_URL}{poster_path}"
        
        return None
        
    except Exception as e:
        return None