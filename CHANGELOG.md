# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2025-10-22
### Added
- Commande palette « Modifier une note (v0.1 tags) » avec autocomplétion depuis `wp_tags/ob_tags_table.md`, édition par chips et écriture conditionnelle de `maj_wp`.

### Changed
- Import CSV WordPress stabilisé : compteurs `summary.created/updated/errors`, différenciation identiques/modifiées, journal d'exécution, et bloc YAML `WP-IMPORT` (dataset `key`/`id`).
- Garde anti-régression pour l'import WP (détection BOM, `sep=`, normalisation des fins de ligne, scan des frontmatters et blocage des CSV obsolètes).

## [0.6.0] - 2025-10-18
### Added
- Import CSV WordPress avec prévisualisation dry-run, sélection du dossier cible, génération des sections créées/mises à jour/erreurs et journal Markdown détaillé.
- Builders YAML dédiés pour garantir un frontmatter homogène et normalisé pour les contenus WordPress (images, catégories, mapping `_notes`).
- Fichiers d'erreur individuels `ERROR_*` et récapitulatif consolidé dans le journal d'import.
- Onglet de paramètres « pierregelas.fr » avec toggle *Écrire des logs d’actions* pour activer/désactiver les exports Markdown.

### Changed
- Catégories WordPress converties en wikilinks (`lien_projet`) et champs image multi-valeurs désormais rendus sous forme de liste YAML.

## [0.5.0] - 2025-10-15
### Added
- Commande « Créer une note Journal » (dérivations `post_titre_*`, liens `lien_archives`/`lien_restes`, renommage auto et corps `## Photo`/`## Notes`).
- Actions « Créer / mettre à jour une note Archives du futur » et « Créer / mettre à jour une note Restes du futur » avec détection zéro-différence, proposition de rename et recopie des champs dépendants du Journal.
- Commande « Journal → Recalculer titres depuis post_titre_1 » pour réécrire les champs dérivés (`post_titre_*`, `img_*`, liens) et renommer le fichier si besoin.

## [0.1.0] - 2025-10-14
### Added
- Commande « Créer une note Minutes » (dérivations automatiques, frontmatter maître, sections `## Vignette`/`## Vidéo`/`## Notes`).
