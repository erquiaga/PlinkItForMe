# Plink It For Me 🎬

Can't decide what to watch? Enter your Letterboxd username and let a Plinko board randomly pick a movie from your watchlist.

## How It Works

1. Enter any public Letterboxd username
2. We randomly select 5 movies from their watchlist
3. Click "Drop Ball!" and watch physics pick one
4. Use the shuffle button to shuffle the 5 selected movies, or search again for a fresh set

**Advanced Options:** Filter by genre or decade to narrow down your selection.

## Tech Stack

**Frontend:** React + TypeScript, Vite, Matter.js, Ant Design  
**Backend:** Python FastAPI, BeautifulSoup, aiohttp, Redis  
**APIs:** TMDB for movie posters  
**Hosting:** Vercel (frontend) + Railway (backend)

## Running Locally

**Prerequisites:**

- Python 3.8+
- Node.js 16+
- Redis
- TMDB API key ([get one free](https://www.themoviedb.org/settings/api))

**Backend:**

```bash
cd backend
pip install -r requirements.txt

# Create .env file with your TMDB API key
echo "TMDB_API_KEY=your_key_here" > .env

# Start Redis
redis-server

# Run the API
python -m uvicorn app:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Backend runs at `http://localhost:8000`, frontend at `http://localhost:5173`

## Performance

- **First search:** 3-5 seconds (scrapes watchlist + caches in Redis)
- **Subsequent searches:** < 1 second (from cache)
- **Cache duration:** 6 hours

## Features

- Physics-based movie selection using Matter.js
- Filter by genre or decade
- Shuffle to get different movie options
- Redis caching for fast repeat searches
- Responsive mobile design
- TMDB integration for high-quality posters

## Support

Enjoying the app? [Buy me a coffee on Ko-fi!](https://ko-fi.com/plinkitforme) ☕

## Credits

Movie data from [The Movie Database (TMDB)](https://www.themoviedb.org/). Not endorsed or certified by TMDB.

Watchlists from [Letterboxd](https://letterboxd.com/). Not affiliated with Letterboxd.

## License

MIT License - feel free to fork and modify!

---

Built by [@erquiaga](https://github.com/erquiaga)
