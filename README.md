# pierregelas.fr — Obsidian plugin

Gamme d’actions pour gérer la création/MAJ de notes (Minutes, Journal, Archives/Restes du futur) et la synchro des tags depuis WordPress (CSV → table locale).

## Fonctionnalités
- **Minutes**: création de note standard avec YAML complet.
- **Journal**: titres dérivés (sans heure), filename image `AAAA-MM-JJ-hh-mm_id_WP.webp`.
- **Archives du futur**: P1 (création) / P2 (mise à jour) depuis une note *Journal photo*.
- **Restes du futur**: P1/P2 sur le même modèle qu’Archives (`_WP.webp → _REI.webp`).
- **Tags v2 (WP→Obsidian)**: diff par groupes (nouveaux, id/name/count update, tags à créer/modifier, problèmes), modale toujours affichée.
- **Logs d’actions (optionnel)**: fichiers Markdown par exécution (entrées/diff/sorties), activables via Settings.

## Commandes (palette)
- `pierregelas.fr: Créer une note Minutes`
- `pierregelas.fr: Créer une note Journal`
- `pierregelas.fr: Journal → Recalculer titres depuis post_titre_1`
- `pierregelas.fr: Archives du futur — Créer (P1)`
- `pierregelas.fr: Archives du futur — Mettre à jour (P2)`
- `pierregelas.fr: Restes du futur — Créer (P1)`
- `pierregelas.fr: Restes du futur — Mettre à jour (P2)`
- `pierregelas.fr: Tags v2 — Mise à jour depuis le dernier CSV`

## Paramètres
- **Settings → pierregelas.fr → “Écrire des logs d’actions”** (ON/OFF).
- Dossiers utilisés par défaut: `wp_tags/ob_tags_table.md`, `wp_tags/logs_tests/`, `wp_tags/backup/`.

## Dev (local)
- `npm i`
- `npm run dev` (watch)
- Ouvrir la vault et activer le plugin **pierregelas.fr**.

## Build manuel / installation
- Fichiers nécessaires: `main.js`, `manifest.json`, `styles.css` (optionnel).
- Copier ces fichiers dans `VAULT/.obsidian/plugins/pierregelas-fr/`. :contentReference[oaicite:3]{index=3}

## Release (pour le store communautaire)
1. Aligner **`manifest.json` → "version"** (ex: `0.6.0`).
2. Mettre à jour **`versions.json`** si tu modifies `minAppVersion`. :contentReference[oaicite:4]{index=4}
3. Créer un **tag GitHub** avec **le même numéro** (sans `v`). :contentReference[oaicite:5]{index=5}
4. Créer une **GitHub Release** avec ce tag et **uploader** `manifest.json`, `main.js`, `styles.css`. :contentReference[oaicite:6]{index=6}
5. Suivre la doc “Submit your plugin” pour l’ajout au registre. :contentReference[oaicite:7]{index=7}

## Licence
0BSD
