---
doc_id: action_restes_du_futur
rAwUrl: https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/ACTION-creer_mettre_a_jour_une_note_restes_du_futur.md
titre_palette: "Créer/Mettre à jour une note Restes du futur"
type_doc: action
version: v1
date_maj: 2025-10-19
etat: courant
---

# ACTION — Créer/Mettre à jour une note Restes du futur

## tl,dr
- Met à jour ou crée une note **Restes du futur** à partir de la note **Journal** correspondante (même mécanique que “Archives du futur”, avec mots-clés **Restes**).
- Résolution: priorité `lien_restes`; fallback par `post_date` + `post_cat` contient `restes-du-futur`.
- Diff (A): compare `post_date`, `tags` (cases cochées **seulement** si différents).
- Diff (B) si le **titre Journal** a changé: mettre à jour `post_titre_1/2/full` (**Restes**), `img_filename` **(_REI_)** + `cover`, `img_alt`, `img_legende`, `lien_journal`, `lien_archives`.
- Rename: proposer si `post_titre_full` évolue (nom du fichier = nouveau titre). Zéro différence: modale “parfaitement à jour”.

## Description

### Différences avec « Archives du futur »

- Source de lien côté Journal: utiliser `lien_restes` (pas `lien_archives`).
- Mot-clé des titres: **Restes** remplace **Archives** dans `post_titre_1`, `post_titre_2`, `post_titre_full`.
- Catégorie de la note cible: `post_cat: ["photo","restes-du-futur"]`.
- Projet: `lien_projet: [[Photo]], [[Restes du futur]]`.
- Dans la note Restes: `lien_restes:` **vide**; `lien_archives:` **copié** depuis la note Journal.
- Image: conversion `_WP.webp` → **`_REI.webp`** (et `cover` = même nom).
- P2 fallback: recherche par `post_date` + `post_cat` contient `restes-du-futur`.
- Modale Diff: identique à Archives (cases décochées si valeurs identiques; renommage proposé si le titre cible change; modale “parfaitement à jour” si 0 changement).

## Roadmap v0 → v1
### ✅ Livré
- [x] Résolution par `lien_restes` avec fallback `post_date` + `post_cat: restes-du-futur` — 2025-10-15
- [x] Diff (A): comparaison `post_date`, `tags` (cases cochées uniquement si différents) — 2025-10-15
- [x] Diff (B) conditionnelle si le **titre Journal** change: `post_titre_1/2/full` (mot-clé **Restes**), `img_filename` **(_REI_)** + `cover`, `img_alt`, `img_legende`, `lien_journal`, `lien_archives` — 2025-10-15
- [x] Rename proposé si `post_titre_full` change (nom de fichier = nouveau titre) — 2025-10-15
- [x] Message “zéro différence” (modale d’information) — 2025-10-15

## Roadmap v1 → v2
### ✅ Livré
- [x] Mise au gabarit du document selon **ACTION_template.md** (frontmatter, tl,dr, roadmaps, logs) — 2025-10-19
### 🔜 À venir
- [ ] Prévisualisation (dry-run) listant précisément les champs qui vont changer
- [ ] Journal détaillé des **champs modifiés** (avant/après avec troncature maîtrisée)
- [ ] Paramètres de l’action (options de rename, strict Windows, seuils de troncature) dans Settings
### 🧪 À évaluer
- [ ] Détection/alerte si l’image **_REI_** référencée est manquante dans la vault
- [ ] Batch: mise à jour multi-notes Restes à partir d’un filtre (plage de dates, tag)
- [ ] Stratégie de merge si la note Restes a du contenu **manuel** non dérivé (zones protégées)
### ❌ Rejeté
- [ ] Flux inversé (générer la note Journal depuis Restes) — non souhaité

## Hors scope
- [DX] Générer un **rapport** de synchronisation (tableau des différences) exportable en `.md`
- [UX] Indicateurs visuels dans la modale (icônes “titre modifié”, “image remplacée”)
- [Perf] Caching temporaire des métadonnées Journal pour accélérer les mises à jour groupées
- [Interop] Option de lecture d’un **CSV des Restes** (audit) sans import

## Logs
### 🗓️ 2025-10-19 — Mise au gabarit et clarifications
> Documentation de l’action alignée sur le **template** unifié; clarification des règles Diff (A/B), rename et message “zéro différence”.
- Résolution: priorité `lien_restes`; fallback `post_date` + `post_cat` contient `restes-du-futur`
- Diff (A): `post_date`, `tags` (cases cochées **seulement** si différents)
- Diff (B): si le titre Journal a changé → `post_titre_1/2/full` (**Restes**), `img_filename` **(_REI_)** + `cover`, `img_alt`, `img_legende`, `lien_journal`, `lien_archives`
- Rename: proposé si `post_titre_full` change
- Zéro différence: modale d’information

### 🗓️ 2025-10-15 — Processus 1 (création Restes du futur)
> Création d’une note Restes à partir de la note **Journal photo**; dérivations titres **Restes**, image `_WP.webp` → **`_REI.webp`**, liens cohérents.
- Source: note **Journal photo** (`post_cat` contient `journal-photo`)
- Titre cible: dérivé de `lien_restes` (texte sans `[[ ]]`), mot-clé **Restes**
- YAML cible: mêmes clés que “Archives”, avec `post_cat: ["photo","restes-du-futur"]`, `lien_projet: [[Photo]], [[Restes du futur]]`, `lien_restes:` vide, `lien_archives:` copié depuis Journal
- Image: `_WP.webp` → **`_REI.webp`**; `cover` = image; `img_alt` = `post_titre_1`; `img_legende` = `post_titre_full`
- Corps: **Photo** (image `_REI.webp`) et **Notes** (`[[post_titre_full_notes]]`)

### 🗓️ 2025-10-15 — Processus 2 (mise à jour Restes du futur)
> Mise à jour automatique des notes Restes à partir des Journaux: on vérifie date/tags, on recopie les champs dépendants du titre Journal si nécessaire, sinon on confirme que tout est déjà à jour.
- Résolution: via `lien_restes` ou fallback par `post_date` + `post_cat` contient `restes-du-futur`
- Diff (A): `post_date`, `tags` (cases cochées **seulement** si différents)
- Diff (B), si le titre Journal a changé: `post_titre_1/2/full` (mot-clé **Restes**), `img_filename` **(_REI_)** + `cover`, `img_alt`, `img_legende`, `lien_journal`, `lien_archives` (copié depuis Journal); cases cochées **seulement** si différents
- Rename: proposé si `post_titre_full` change (nom de fichier = nouveau titre)
- Zéro différence: modale d’information « La note “Restes du futur” est parfaitement à jour ! »
