# 🎬 Ciné Poster — TRMNL Plugin

Une affiche de film aléatoire tirée du catalogue TMDB, filtrable par **genre** et **décennie**, avec dithering 1-bit du framework TRMNL.

> This product uses the TMDB API but is not endorsed or certified by TMDB.

## Comment ça marche (double aléatoire)

1. **Chaque jour à 5h UTC**, GitHub Actions exécute `src/fetch-movies.js` : pour chacune des 77 combinaisons (11 genres × 7 décennies), le script pioche une **page aléatoire** parmi les 5 plus populaires de `/discover/movie`, puis **6 films au hasard** dans cette page → pool d'environ 460 films, renouvelé quotidiennement, publié dans `data.json` (~60 Ko).
2. **À chaque refresh du device** (60 min par défaut), le Liquid filtre le pool selon les custom fields de l'utilisateur, puis pioche via `timestamp % pool.size` → nouvelle affiche à chaque rendu.

Résultat : le même film ne réapparaît quasiment jamais.

## Déploiement

1. Crée le repo GitHub (ex. `trmnl-cine-poster`), pousse ces fichiers.
2. **Settings → Secrets → Actions** : ajoute `TMDB_API_KEY` (clé v3 gratuite sur themoviedb.org).
3. **Settings → Pages** : Deploy from branch `main`, dossier `/` (root).
4. Lance le workflow manuellement une première fois (`workflow_dispatch`) pour générer `data.json`.
5. Dans TRMNL → Private Plugin : copie `settings.yml` (remplace `<TON-REPO>`), colle `views/shared.liquid` dans l'onglet **Shared**, et chaque layout dans son onglet.
6. Vérifie avec le Chef linter, puis soumets en Recipe. 🍳

## Structure du data.json

```json
{
  "updated": "2026-07-23T05:00:00Z",
  "count": 460,
  "movies": [
    { "t": "Blade Runner", "y": "1982", "p": "/xxx.jpg", "r": 7.9, "g": "sf", "d": "d1980" }
  ]
}
```

Champs compressés pour rester léger : `t` titre (fr), `y` année, `p` poster_path TMDB, `r` note, `g` genre, `d` décennie.

## Notes

- Seuil `vote_count.gte: 300` (100 avant 1970) → uniquement des films connus, affiches de qualité.
- Images servies en `w342` (full/half_vertical) et `w185` (petits layouts) — bon compromis netteté/poids pour le rendu e-ink.
- Si une combinaison est vide, le template retombe sur le pool complet (jamais d'écran vide).
