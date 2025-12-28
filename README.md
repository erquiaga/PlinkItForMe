# Plink It For Me 🎬

A fun and interactive Letterboxd watchlist picker that uses a physics-based Plinko game to randomly select movies for you to watch!

![Plinko Game](https://img.shields.io/badge/Game-Plinko-orange) ![Python](https://img.shields.io/badge/Python-3.8+-blue) ![React](https://img.shields.io/badge/React-TypeScript-61dafb) ![Redis](https://img.shields.io/badge/Redis-Caching-red)

## ✨ Features

- **Letterboxd Integration** - Scrapes your entire watchlist asynchronously
- **Physics-Based Selection** - Interactive Plinko board using Matter.js
- **Movie Posters** - Fetches high-quality posters from TMDB API

## 🛠️ Tech Stack

### Frontend

- **React** with TypeScript
- **Vite** for build tooling
- **Matter.js** for physics simulation
- **Ant Design** for UI components

### Backend

- **Python 3.8+** with FastAPI
- **BeautifulSoup4** for web scraping
- **aiohttp** for async HTTP requests
- **Redis** for caching

### APIs

- **Letterboxd** (web scraping)
- **TMDB API** for movie posters

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8 or higher**
- **Node.js 16 or higher**
- **Redis** (see installation instructions below)
- **TMDB API Key** ([Get one here](https://www.themoviedb.org/settings/api))

### Installing Redis

**Windows:**

```bash
# Using Chocolatey
choco install redis-64

# Or download directly from:
# https://github.com/tporadowski/redis/releases
```

**macOS:**

```bash
brew install redis
brew services start redis
```

**Linux:**

```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/plinkitforme.git
cd plinkitforme
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create .env file from template
cp .env.example .env

# Edit .env and add your TMDB API key
# TMDB_API_KEY=your_actual_api_key_here
```

**Start Redis:**

```bash
redis-server
```

**Run the backend:**

```bash
python -m uvicorn app:app --reload
```

Backend will be running at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be running at `http://localhost:5173`

## Usage

1. **Enter a Letterboxd username** in the search bar
2. **Wait for movies to load** (first search takes 3-5 seconds, subsequent searches are instant due to caching)
3. **Click "Drop Ball!"** to start the Plinko game
4. **Watch the physics** as the ball bounces through pegs
5. **See your movie!** A modal will appear with the randomly selected film

### Pro Tips:

- Cache expires after 6 hours, ensuring fresh data
- Sound effects make it more satisfying!
- Works with any public Letterboxd watchlist

## Project Structure

```
plinkitforme/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── scraper.py          # Async Letterboxd scraper with Redis caching
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment variables template
│   └── .env                # Your API keys (gitignored!)
│
├── frontend/
│   ├── public/
│   │   └── sounds/         # Sound effect files
│   ├── src/
│   │   ├── components/
│   │   │   ├── Plinko.tsx       # Main Plinko game component
│   │   │   ├── Plinko.css
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── LoadingSpinner.css
│   │   ├── api/
│   │   │   └── Api.ts      # API client
│   │   ├── App.tsx         # Main app component
│   │   ├── App.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
├── README.md
└── LICENSE
```

## ⚡ Performance

**First Search:**

- Scrapes all watchlist pages in parallel (~3-5 seconds)
- Stores results in Redis cache
- Fetches TMDB posters for 5 selected movies

**Subsequent Searches (same user):**

- Retrieves from Redis cache (< 1 second)
- Only fetches new TMDB posters

**Cache Duration:** 6 hours

## 🎨 Customization

### Changing Plinko Physics

Edit `frontend/src/components/Plinko.tsx`:

```typescript
const PHYSICS_CONFIG = {
  gravity: 1.2, // Gravity strength
  ballRestitution: 0.5, // Bounciness
  pegRows: 9, // Number of peg rows
  // ... more settings
};
```

### Changing Cache Duration

Edit `backend/scraper.py`:

```python
CACHE_EXPIRATION = 21600  # 6 hours in seconds
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- **TMDB** - Movie poster data from [The Movie Database](https://www.themoviedb.org/)
- **Letterboxd** - Watchlist data from [Letterboxd](https://letterboxd.com/)
- **Matter.js** - Physics engine for the Plinko game
- Inspired by the [Letterboxd Watchlist Picker](https://watchlistpicker.com/)

## ⚠️ Disclaimer

This product uses the TMDB API but is not endorsed or certified by TMDB.

This is an independent project and is not affiliated with, endorsed by, or connected to Letterboxd.

---

**Enjoy picking your next movie with Plinko!** 🎬🎲
