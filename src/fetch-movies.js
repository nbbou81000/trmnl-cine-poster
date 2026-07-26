// ============================================================
// Ciné Poster — fetch-movies.js
// Tire un pool aléatoire de films TMDB par genre × décennie,
// et publie DEUX fichiers (un par langue) sur GitHub Pages :
//   data-fr.json / data-en.json
// Le Polling URL de TRMNL est dynamique ({{ language }}), donc
// chaque fichier ne contient qu'une langue → deux fois moins
// lourd à contenu égal → résumés complets sans dépasser 100 Ko.
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

const MOVIES_PER_COMBO = 2;   // 11 genres × 7 décennies × 2 ≈ 154 films par langue → marge pour casting/réalisateur
const MAX_RANDOM_PAGE = 5;    // on pioche dans les 5 premières pages (top popularité)
const OVERVIEW_MAX_LEN = 350; // rarement atteint (la plupart des résumés TMDB sont plus courts) → coupe au mot le plus proche + "…"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pickRandom = (arr, n) =>
  [...arr].sort(() => Math.random() - 0.5).slice(0, n);

function truncateAtWord(str, max) {
  if (!str) return "";
  if (str.length <= max) return str;
  const cut = str.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "…";
}

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

// Réalisateur + durée + casting : noms propres, identiques quelle que soit la langue
async function fetchCredits(movieId) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    language: "en-US",
    append_to_response: "credits",
  });
  const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?${params}`);
  if (!res.ok) throw new Error(`TMDB details ${res.status}`);
  const data = await res.json();
  const crew = data.credits?.crew || [];
  const cast = data.credits?.cast || [];
  const director = crew.find((c) => c.job === "Director");
  return {
    runtime: data.runtime || null,
    director: director ? director.name : "",
    cast: cast.slice(0, 3).map((c) => c.name),
  };
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

  // Retourne une paire {fr, en} par film sélectionné, mêmes métadonnées communes
  const output = [];
  for (const m of picked) {
    const en = enById.get(m.id) || {};

    let credits = { runtime: null, director: "", cast: [] };
    try {
      await sleep(120);
      credits = await fetchCredits(m.id);
    } catch (e) {
      console.warn(`  ⚠ credits ${m.id} (${m.title}) : ${e.message}`);
    }

    const common = {
      id: m.id,
      y: (m.release_date || "").slice(0, 4),
      r: Math.round(m.vote_average * 10) / 10,
      g: genreKey,
      d: decadeKey,
      runtime: credits.runtime,
      director: credits.director,
      cast: credits.cast,
    };

    output.push({
      fr: { t: m.title, o: truncateAtWord(m.overview || "", OVERVIEW_MAX_LEN), p: m.poster_path || en.poster_path, ...common },
      en: { t: en.title || m.title, o: truncateAtWord(en.overview || m.overview || "", OVERVIEW_MAX_LEN), p: en.poster_path || m.poster_path, ...common },
    });
  }
  return output;
}

async function main() {
  const moviesFr = [];
  const moviesEn = [];

  for (const [genreKey, genreId] of Object.entries(GENRES)) {
    for (const [decadeKey, range] of Object.entries(DECADES)) {
      try {
        const batch = await fetchCombo(genreKey, genreId, decadeKey, range);
        for (const pair of batch) {
          moviesFr.push(pair.fr);
          moviesEn.push(pair.en);
        }
        console.log(`✓ ${genreKey} / ${decadeKey} : ${batch.length} films`);
      } catch (e) {
        console.warn(`⚠ ${genreKey} / ${decadeKey} : ${e.message}`);
      }
      await sleep(120); // courtoisie API
    }
  }

  const now = new Date().toISOString();

  for (const [lang, movies] of [["fr", moviesFr], ["en", moviesEn]]) {
    const payload = { updated: now, count: movies.length, movies };
    const json = JSON.stringify(payload);
    const sizeKb = json.length / 1024;

    writeFileSync(`data-${lang}.json`, json);
    console.log(`✅ data-${lang}.json généré : ${movies.length} films (${sizeKb.toFixed(1)} Ko)`);

    if (sizeKb > 80) {
      console.warn(`⚠️  data-${lang}.json : ${sizeKb.toFixed(1)} Ko approche la limite TRMNL de 100 Ko.`);
      console.warn(`   Réduis MOVIES_PER_COMBO ou OVERVIEW_MAX_LEN si le plugin passe en état dégradé.`);
    }
  }
}

main();
