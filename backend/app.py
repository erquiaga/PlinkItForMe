from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from scraper import get_watchlist_movies, get_movie_data
import random
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://plink-it-for-me.vercel.app",
        "https://plinkitforme.com",
        "https://www.plinkitforme.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "PlinkItForMe API"}

@app.get("/watchlist/{username}")
def get_watchlist(
    username: str,
    genre: Optional[str] = Query(None),
    decade: Optional[str] = Query(None)
):
    movies = get_watchlist_movies(username, genre=genre, decade=decade)
    
    if movies is None:
        raise HTTPException(
            status_code=404, 
            detail="user_not_found"
        )
    
    if len(movies) == 0:
        if genre and decade:
            detail = f"no_movies_filters_both"
        elif genre:
            detail = f"no_movies_filter_genre"
        elif decade:
            detail = f"no_movies_filter_decade"
        else:
            detail = "no_movies"
        
        raise HTTPException(status_code=404, detail=detail)
    
    if len(movies) < 5:
        raise HTTPException(
            status_code=400, 
            detail=f"not_enough_movies:{len(movies)}"
        )
    
    num_to_select = min(5, len(movies))
    random_movies = random.sample(movies, num_to_select)
    
    for movie in random_movies:
        poster_url = get_movie_data(movie['title'], movie['year'])
        movie['poster'] = poster_url
    
    return {
        "username": username,
        "count": len(movies),
        "selected_count": len(random_movies),
        "movies": random_movies
    }