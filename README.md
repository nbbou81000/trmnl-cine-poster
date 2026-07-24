# 🎬 Ciné Poster — TRMNL Plugin

Une affiche de film aléatoire tirée du catalogue TMDB, filtrable par **genre(s)**, **décennie(s)**, avec **résumé optionnel** et **choix de langue** (FR/EN).

> This product uses the TMDB API but is not endorsed or certified by TMDB.

## Comment ça marche

1. **Chaque jour à 5h UTC**, GitHub Actions exécute `src/fetch-movies.js` : pour chacune des 77 combinaisons (11 genres × 7 décennies), le script pioche une page aléatoire parmi les 5 plus populaires de `/discover/movie`, tire 6 films au hasard, **puis récupère le titre + résumé en français ET en anglais** pour chacun (2 appels TMDB par combo) → pool d'environ 460 films bilingues, publié dans `data.json`.
2. **À chaque refresh du device** (60 min par défaut), le Liquid filtre le pool selon les genres/décennies sélectionnés (multi-choix), pioche via `timestamp % pool.size`, puis affiche titre/résumé dans la langue choisie.

## Options disponibles

- **Genre(s)** : multi-sélection, aucun choix = tous les genres
- **Décennie(s)** : multi-sélection, aucun choix = toutes les décennies
- **Langue** : Français ou English (titre + résumé)
- **Infos du film** : afficher ou non le panneau titre/année/note (sinon affiche plein écran)
- **Résumé du film** : afficher le résumé (nécessite "Infos du film" activé)

## Déploiement

1. Crée le repo GitHub, pousse ces fichiers.
2. **Settings → Secrets → Actions** : ajoute `TMDB_API_KEY`.
3. **Settings → Pages** : Deploy from branch `main`, dossier `/ (root)`.
4. Lance le workflow manuellement (`workflow_dispatch`) pour générer `data.json`.
5. TRMNL → Private Plugin : Polling URL = ton `data.json`, colle `shared.liquid` dans l'onglet Shared, colle chaque layout, colle le contenu de `settings.yml` → section `custom_fields` dans le champ Custom Fields.
6. Vérifie avec le Chef linter, puis soumets en Recipe.

## Structure du data.json

```json
{
  "updated": "2026-07-24T05:00:00Z",
  "count": 460,
  "movies": [
    {
      "t_fr": "Blade Runner", "t_en": "Blade Runner",
      "o_fr": "Résumé en français...", "o_en": "Summary in English...",
      "y": "1982", "p": "/xxx.jpg", "r": 7.9, "g": "sf", "d": "d1980"
    }
  ]
}
```

## Notes

- Résumés tronqués à 320 caractères à la génération (poids raisonnable), puis re-tronqués à l'affichage (280 car. sur le layout full).
- Seuil `vote_count.gte: 300` (100 avant 1970).
- Si une combinaison genre+décennie est vide, repli automatique sur le pool complet.
- Le multi-select genre/décennie double le nombre d'appels TMDB (titre+résumé FR/EN par film) : ~150 requêtes/jour, largement sous les limites TMDB.
