from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from scraper import get_watchlist_movies, get_movie_data

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "PlinkItForMe API"}

import random

@app.get("/watchlist/{username}")
def get_watchlist(username: str):
    movies = get_watchlist_movies(username)
    
    if movies is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    random_movies = random.sample(movies, min(5, len(movies)))
    
    for movie in random_movies:
        poster_url = get_movie_data(movie['title'], movie['year'])
        movie['poster'] = poster_url
    
    return {
        "username": username,
        "count": len(movies),
        "selected_count": len(random_movies),
        "movies": random_movies
    }
    
