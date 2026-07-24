// ============================================================
// Ciné Poster — fetch-movies.js
// Tire un pool aléatoire de films TMDB par genre × décennie,
// et publie data.json (servi par GitHub Pages).
// Relancé chaque jour par GitHub Actions → le pool change 1×/jour.
// ============================================================

import { writeFileSync } from "node:fs";

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error("❌ TMDB_API_KEY manquant (secret GitHub Actions)");
  process.exit(1);
}

const BASE = "https://api.themoviedb.org/3/discover/movie";

// Clés = valeurs des custom fields dans settings.yml
const GENRES = {
  action: 28,
  aventure: 12,
  animation: 16,
  comedie: 35,
  crime: 80,
  drame: 18,
  fantastique: 14,
  horreur: 27,
  romance: 10749,
  sf: 878,
  thriller: 53,
};

const DECADES = {
  pre1970: ["1930-01-01", "1969-12-31"],
  d1970: ["1970-01-01", "1979-12-31"],
  d1980: ["1980-01-01", "1989-12-31"],
  d1990: ["1990-01-01", "1999-12-31"],
  d2000: ["2000-01-01", "2009-12-31"],
  d2010: ["2010-01-01", "2019-12-31"],
  d2020: ["2020-01-01", "2029-12-31"],
};

const MOVIES_PER_COMBO = 6;   // 11 genres × 7 décennies × 6 ≈ 460 films max
const MAX_RANDOM_PAGE = 5;    // on pioche dans les 5 premières pages (top popularité)
const OVERVIEW_MAX_LEN = 320; // tronque les résumés trop longs

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pickRandom = (arr, n) =>
  [...arr].sort(() => Math.random() - 0.5).slice(0, n);

async function discover(genreId, dateGte, dateLte, page, minVotes, language) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    language,
    sort_by: "popularity.desc",
    include_adult: "false",
    "vote_count.gte": String(minVotes),
    with_genres: String(genreId),
    "primary_release_date.gte": dateGte,
    "primary_release_date.lte": dateLte,
    page: String(page),
  });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

async function fetchCombo(genreKey, genreId, decadeKey, [gte, lte]) {
  // Films anciens = moins de votes sur TMDB → seuil abaissé
  const minVotes = decadeKey === "pre1970" ? 100 : 300;

  // 1er appel (FR) pour connaître total_pages, puis page aléatoire
  const first = await discover(genreId, gte, lte, 1, minVotes, "fr-FR");
  const totalPages = Math.min(first.total_pages || 1, MAX_RANDOM_PAGE);
  const page = 1 + Math.floor(Math.random() * totalPages);

  let resultsFr = first.results || [];
  if (page > 1) {
    await sleep(120);
    resultsFr = (await discover(genreId, gte, lte, page, minVotes, "fr-FR")).results || resultsFr;
  }

  // Même page, en anglais, pour récupérer titre + résumé EN (mêmes films, même tri)
  await sleep(120);
  const resultsEn = (await discover(genreId, gte, lte, page, minVotes, "en-US")).results || [];
  const enById = new Map(resultsEn.map((m) => [m.id, m]));

  const picked = pickRandom(
    resultsFr.filter((m) => m.poster_path),
    MOVIES_PER_COMBO
  );

  return picked.map((m) => {
    const en = enById.get(m.id) || {};
    return {
      t_fr: m.title,
      t_en: en.title || m.title,
      o_fr: (m.overview || "").slice(0, OVERVIEW_MAX_LEN),
      o_en: (en.overview || m.overview || "").slice(0, OVERVIEW_MAX_LEN),
      y: (m.release_date || "").slice(0, 4),
      p: m.poster_path,
      r: Math.round(m.vote_average * 10) / 10,
      g: genreKey,
      d: decadeKey,
    };
  });
}

async function main() {
  const movies = [];
  for (const [genreKey, genreId] of Object.entries(GENRES)) {
    for (const [decadeKey, range] of Object.entries(DECADES)) {
      try {
        const batch = await fetchCombo(genreKey, genreId, decadeKey, range);
        movies.push(...batch);
        console.log(`✓ ${genreKey} / ${decadeKey} : ${batch.length} films`);
      } catch (e) {
        console.warn(`⚠ ${genreKey} / ${decadeKey} : ${e.message}`);
      }
      await sleep(120); // courtoisie API
    }
  }

  const payload = {
    updated: new Date().toISOString(),
    count: movies.length,
    movies,
  };

  writeFileSync("data.json", JSON.stringify(payload));
  console.log(`\n✅ data.json généré : ${movies.length} films (${(JSON.stringify(payload).length / 1024).toFixed(0)} Ko)`);
}

main();
