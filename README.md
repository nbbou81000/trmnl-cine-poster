# Ciné Poster — TRMNL plugin

**A random movie poster from TMDB on your TRMNL e-ink display, filtered by genre, decade and rating, with an optional info panel and synopsis. English / French.**

[![Install on TRMNL](https://img.shields.io/badge/TRMNL-Install%20recipe-black?style=flat-square)](https://trmnl.com/recipes/393117)
![Languages](https://img.shields.io/badge/languages-EN%20%7C%20FR-blue?style=flat-square)
![New pool](https://img.shields.io/badge/new%20pool-every%20day-orange?style=flat-square)
![Server cost](https://img.shields.io/badge/server%20cost-0%20%E2%82%AC-brightgreen?style=flat-square)

![Ciné Poster on a TRMNL display](https://trmnl-public.s3.us-east-2.amazonaws.com/4kv1er8o8k8fim2xr7kqc6yp9kog)

---

## What it does

Turns your TRMNL into a tiny movie theatre lobby. Each refresh shows a poster picked from a fresh pool of movies, rebuilt every day.

With the info panel on, you also get the title, year, TMDB rating, director, main cast, runtime and a synopsis — plus a QR code to the movie's TMDB page.

Poster only, info panel, synopsis or not: you choose how much text sits next to the image.

## Settings

| Setting | Options | Notes |
|---|---|---|
| **Genre(s)** | Action, Adventure, Animation, Comedy, Crime, Drama, Fantasy, Horror, Romance, Science fiction, Thriller | Multi-select. None selected = all genres |
| **Decade(s)** | Classics (before 1970), 1970s, 1980s, 1990s, 2000s, 2010s, 2020s | Multi-select. None selected = all decades |
| **Minimum rating** | All / 6+ / 7+ / 7.5+ / 8+ | TMDB rating |
| **Language** | Français / English | Title and synopsis |
| **Movie info** | Yes / No (poster only) | Title, year and rating panel |
| **Synopsis** | Yes / No | Requires *Movie info* |

## Installation

1. Open the recipe page: **[trmnl.com/recipes/393117](https://trmnl.com/recipes/393117)**
2. Click **Install**, pick your genres and decades, and add it to a playlist.

No TMDB account or API key needed on your side.

---

## How it works

```
TMDB API ──► GitHub Actions (daily, 05:00 UTC) ──► data-fr.json + data-en.json ──► GitHub Pages ──► TRMNL
```

Every day, `src/fetch-movies.js` builds a new pool:

1. For each of the **77 combinations** (11 genres × 7 decades), it queries TMDB `/discover/movie` on a random page among the most popular results, with a vote threshold so only well-known movies come up.
2. It keeps **2 movies per combination** — about 154 movies.
3. For each movie it fetches the director, top 3 cast members and runtime.
4. It writes **one file per language**. The TRMNL Polling URL includes the language setting, so each device only downloads the language it needs — half the weight, full synopses, well under TRMNL's 100 KB limit.

On the device, the Liquid template filters the pool by your genres, decades and minimum rating, then picks a movie from the timestamp. If your filters leave nothing, it falls back to the full pool rather than showing an empty screen.

### Data endpoints

| URL | Content |
|---|---|
| `https://nbbou81000.github.io/trmnl-cine-poster/data-fr.json` | Pool in French |
| `https://nbbou81000.github.io/trmnl-cine-poster/data-en.json` | Pool in English |

```json
{
  "updated": "2026-10-08T05:00:00Z",
  "count": 154,
  "movies": [
    {
      "id": 22356,
      "t": "Angel and the Badman",
      "o": "Notorious shootist and womanizer Quirt Evans…",
      "y": "1947",
      "r": 6.4,
      "g": "action",
      "d": "pre1970",
      "p": "/tbnte13MT1mke828R0rKmNZ41G6.jpg",
      "runtime": 100,
      "director": "James Edward Grant",
      "cast": ["John Wayne", "Gail Russell", "Harry Carey"]
    }
  ]
}
```

Keys are kept short (`t` title, `o` overview, `y` year, `r` rating, `g` genre, `d` decade, `p` poster path) to save space. Synopses are cut at the nearest word under 350 characters.

---

## Repository layout

| Path | Role |
|---|---|
| `src/fetch-movies.js` | Builds the daily pool from the TMDB API |
| `data-fr.json`, `data-en.json` | The JSON files polled by TRMNL |
| `data.json` | Former single-file bilingual format, kept for compatibility |
| `.github/workflows/update.yml` | Runs the script every day at 05:00 UTC (and on demand) |

## Run your own

1. Fork the repo.
2. Get a free API key on [themoviedb.org](https://www.themoviedb.org/settings/api), then add it as `TMDB_API_KEY` under **Settings › Secrets and variables › Actions**.
3. **Settings › Pages**: deploy from the `main` branch, root folder.
4. **Actions** tab: enable workflows, then **Run workflow** once.
5. In TRMNL, point the Polling URL to `https://YOUR-USERNAME.github.io/trmnl-cine-poster/data-{{ language }}.json`.

## Credits

<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB" width="120">

This product uses the TMDB API but is not endorsed or certified by TMDB. Posters and movie data © their respective owners, provided by [The Movie Database](https://www.themoviedb.org/).

Built for [TRMNL](https://trmnl.com).

## Author

Made by **Nicolas Bouteiller** — [@nbbou81000](https://github.com/nbbou81000) · nb.bouteiller@gmail.com

If you enjoy it, you can [buy me a coffee on Ko-fi](https://ko-fi.com/nicolasbouteiller) ☕

## License

Code under the MIT License — see [`LICENSE`](LICENSE).
