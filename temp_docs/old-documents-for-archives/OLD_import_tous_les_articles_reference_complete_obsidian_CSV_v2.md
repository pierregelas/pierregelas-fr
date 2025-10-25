---
doc_id: import_tous_les_articles
titre: "Import “Tous les articles” — Référence complète (Obsidian ⇄ CSV)"
type_doc: spec
version: v2
version_precedente: v1
date_maj: 2025-10-08
etat: courant
notes: "v2 = simplification du flux et séparation contenus / portfolio"
---


## Introduction

Conception d'une **infrastructure de données unifiée** dans une vault Obsidian, pensée comme **le cœur d'un écosystème de production et de publication** :

- **Base de données personnelle** (projets, productions, vidéos).
- **Passerelle WP → Obsidian** via export CSV (_WP Import Export Lite_) + **CSV/JSON Importer** et un **template Handlebars** + **helpers.js**.
- **Obsidian → WP** via exports depuis des vues `.base`/Dataview (hors périmètre v2 “site”).

> **Nom de note** (Field to use as Note name) : `${wp_titre}` ou `@{ return (this.wp_titre ?? '').trim(); }`.  
> Les caractères non sûrs (`? \ / * " < > | :`) peuvent être remplacés automatiquement dans le **filename** ; le YAML conserve le titre exact.

---

### 🧭 Contexte et objectifs du document

Ce document centralise :

- la **correspondance complète** CSV (WordPress) → **YAML** (Obsidian) avec règles, types et transformations ;
- le **template Handlebars** final v2 ;
- le **helpers.js** (helpers utilisés : `slugify_wp`, `startsWith`) ;
- les **paramètres clés** du plugin CSV/JSON Importer.  
    Objectif : une **interopérabilité claire et stable** WP → Obsidian, avec toutes les métadonnées WP en YAML et un corps de note ré-importable.

---

### 🔜 Étapes suivantes du projet

1. **Créer un mini plugin local Obsidian (non publié)**  
   Automatiser la création/mise à jour de notes selon les règles (ex. marquage `wp_correction`, `wp_update`, normalisations, relances d’import ciblées).

2. **Ajouter un helper `includes`**  
   Permettre des tests de sous-chaîne (ex. « si `wp_categories` **contient** `Projets`… ») pour diversifier les comportements conditionnels dans le template.

3. **Automatiser les liens croisés**  
   Pré-remplir `lien_prods` et d’autres relations internes à partir de motifs (catégories, tags, patrons de titres), avec déduplication et vérification d’existence des notes cibles.

4. **(Option) Générer les notes de taxonomie**  
   Créer/mettre à jour automatiquement des notes pour chaque `wp_tag` / `wp_category` (depuis exports WP “tags” et “categories” contenant label/slug/id/count) afin d’alimenter des tables `.base` par taxonomie.

---

## 1) 🧩 Mappage CSV → YAML (avec règles)

Les champs **orientés CV** sont **supprimés** en v2 (colonne “V2”).  
“Nouveau” = nouveau nom de champ YAML ; “Obsolète” = à retirer du template.


| Champ YAML (v2)      | Source CSV                  | V2                                        | Type               | Règle / Transformation                                             |
| -------------------- | --------------------------- | ----------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| `cover`              | `wp_img_url`                | —                                         | texte              | Prendre **la 1ʳᵉ URL** (séparateur `                               |
| `descr_obs`          | —                           | —                                         | texte              | Champ libre Obsidian.                                              |
| `lien_projet`        | `wp_categories`             | —                                         | **liste**          | **Découpe sur `>`**, garde libellé non-slugifié, rend `[[Nom]]`.   |
| `post_date`          | `wp_date`                   | **Nouveau** (remplace `prod_diff`)        | texte ISO          | `YYYY-MM-DDTHH:MM:SS` (remplacer l’espace par `T`).                |
| `titre`              | `wp_titre`                  | —                                         | texte              | Copie directe.                                                     |
| `tags`               | `wp_tags` + `wp_categories` | —                                         | **liste**          | Fusion : `wp_tags` (`,`), `wp_categories` (`>`), puis **slugify**. |
| `type_note`          | —                           | —                                         | texte / liste      | Libre (si utile côté site).                                        |
| `wp_categories`      | `wp_categories`             | —                                         | **liste**          | `>` → liste + **slugify**.                                         |
| `wp_id`              | `wp_id`                     | —                                         | nombre             | Copie directe.                                                     |
| `wp_type`            | `wp_type`                   | —                                         | texte              | Copie directe.                                                     |
| `wp_status`          | `wp_status`                 | —                                         | texte              | Copie directe.                                                     |
| `wp_perma`           | `wp_perma`                  | —                                         | texte              | Permalink.                                                         |
| `wp_date`            | `wp_date`                   | —                                         | texte ISO          | Date brute WP en ISO.                                              |
| `post_modified`      | `wp_date_modified`          | **Nouveau** (remplace `wp_date_modified`) | texte ISO          | Date de modification ISO.                                          |
| `wp_extrait`         | `wp_extrait`                | —                                         | texte              | Copie directe.                                                     |
| `wp_carnet_link`     | `wp_carnet_link`            | —                                         | texte              | Copie directe.                                                     |
| `wp_carnet_on`       | `wp_carnet_on`              | —                                         | booléen            | **true** si non vide, **false** sinon.                             |
| `wp_a_descr_gen`     | `wp_a_descr_gen`            | —                                         | texte              | ACF.                                                               |
| `wp_a_titre_gen`     | `wp_a_titre_gen`            | —                                         | texte              | ACF.                                                               |
| `wp_a_stitre_gen`    | `wp_a_stitre_gen`           | —                                         | texte              | ACF.                                                               |
| `wp_a_videolink_gen` | `wp_a_videolink_gen`        | —                                         | texte              | ACF.                                                               |
| `wp_img_url`         | `wp_img_url`                | —                                         | **liste**          | Séparation `                                                       |
| `wp_img_alt`         | `wp_img_alt`                | —                                         | **liste**          | Séparation `                                                       |
| `wp_img_caption`     | `wp_img_caption`            | —                                         | **liste**          | Séparation `                                                       |
| `wp_img_descr`       | `wp_img_descr`              | —                                         | **liste**          | Séparation `                                                       |
| `wp_img_filename`    | `wp_img_filename`           | —                                         | **liste**          | Séparation `                                                       |
| `wp_img_id`          | `wp_img_id`                 | —                                         | **liste**          | Séparation `                                                       |
| `wp_img_titre`       | `wp_img_titre`              | —                                         | **liste**          | Séparation `                                                       |
| `wp_correction`      | —                           | —                                         | booléen (checkbox) | **Par défaut `false`**.                                            |
| `wp_update`          | —                           | —                                         | booléen            | **Par défaut `false`**.                                            |


---

## 2) 🧪 Template Handlebars (CSV/JSON Importer)

> À coller tel quel dans ton fichier **Template Handlebars général.md**.

```hbs
---
# ———————— CHAMPS GÉNÉRAUX ————————
cover: "{{#each (strsplit wp_img_url "||")}}{{#if @first}}{{replacereg this "^\s+|\s+$" ""}}{{/if}}{{/each}}"
descr_obs:

# Liens internes de projet depuis les catégories (libellés non-slugifiés)
lien_projet:
{{#each (strsplit wp_categories ">")}}
  {{#if (replacereg this "^\s*$" "")}}- "[[{{replacereg this "^\s+|\s+$" ""}}]]"{{/if}}
{{/each}}

# Date de publication normalisée (remplace l'ancien prod_diff)
post_date: "{{replacereg wp_date " " "T"}}"

# ———————— TITRE + TAGS ————————
titre: "{{wp_titre}}"

# Tags = fusion wp_tags + wp_categories (slugifiés)
tags:
{{!-- D'abord les tags WP (séparés par des virgules) --}}
{{#each (strsplit wp_tags ",")}}
  {{#if (replacereg this "^\s*$" "")}}- {{slugify_wp (replacereg this "^\s+|\s+$" "")}}{{/if}}
{{/each}}

{{!-- Puis les catégories WP (chemin séparé par ">") --}}
{{#each (strsplit wp_categories ">")}}
  {{#if (replacereg this "^\s*$" "")}}- {{slugify_wp (replacereg this "^\s+|\s+$" "")}}{{/if}}
{{/each}}

# Type de note libre (si utile côté site)
type_note:

# ———————— CATÉGORIES WP ————————
wp_categories:
{{#each (strsplit wp_categories ">")}}
  {{#if (replacereg this "^\s*$" "")}}- {{slugify_wp (replacereg this "^\s+|\s+$" "")}}{{/if}}
{{/each}}

# ———————— MÉTA WORDPRESS ————————
wp_id: {{wp_id}}
wp_type: "{{wp_type}}"
wp_status: "{{wp_status}}"
wp_perma: "{{wp_perma}}"

# Dates brutes WP en ISO
wp_date: "{{replacereg wp_date " " "T"}}"

# Date de modification (nouveau champ)
post_modified: "{{replacereg wp_date_modified " " "T"}}"

wp_extrait: "{{wp_extrait}}"

# ———————— CARNET LIÉ ————————
wp_carnet_link: "{{wp_carnet_link}}"
wp_carnet_on: {{#if (replacereg wp_carnet_on "^\s*$" "")}}true{{else}}false{{/if}}

# ———————— ACF ————————
wp_a_descr_gen: "{{wp_a_descr_gen}}"
wp_a_titre_gen: "{{wp_a_titre_gen}}"
wp_a_stitre_gen: "{{wp_a_stitre_gen}}"
wp_a_videolink_gen: "{{wp_a_videolink_gen}}"

# ———————— IMAGES WP (séparateur "||") ————————
wp_img_url:
{{#each (strsplit wp_img_url "||")}}
  {{#if (replacereg this "^\s*$" "")}}- {{replacereg this "^\s+|\s+$" ""}}{{/if}}
{{/each}}

wp_img_alt:
{{#each (strsplit wp_img_alt "||")}}
  {{#if (replacereg this "^\s*$" "")}}- {{replacereg this "^\s+|\s+$" ""}}{{/if}}
{{/each}}

wp_img_caption:
{{#each (strsplit wp_img_caption "||")}}
  {{#if (replacereg this "^\s*$" "")}}- {{replacereg this "^\s+|\s+$" ""}}{{/if}}
{{/each}}

wp_img_descr:
{{#each (strsplit wp_img_descr "||")}}
  {{#if (replacereg this "^\s*$" "")}}- {{replacereg this "^\s+|\s+$" ""}}{{/if}}
{{/each}}

wp_img_filename:
{{#each (strsplit wp_img_filename "||")}}
  {{#if (replacereg this "^\s*$" "")}}- {{replacereg this "^\s+|\s+$" ""}}{{/if}}
{{/each}}

wp_img_id:
{{#each (strsplit wp_img_id "||")}}
  {{#if (replacereg this "^\s*$" "")}}- "{{replacereg this "^\s+|\s+$" ""}}"{{/if}}
{{/each}}

wp_img_titre:
{{#each (strsplit wp_img_titre "||")}}
  {{#if (replacereg this "^\s*$" "")}}- {{replacereg this "^\s+|\s+$" ""}}{{/if}}
{{/each}}

# ———————— WORKFLOW ————————
wp_correction: false
wp_update: false
---

{{!-- Corps conditionnel — Photo vs Vidéo --}}
{{#if (startsWith wp_categories "Photo")}}

## Photos

{{#each (strsplit wp_img_url "||")}}
{{#if (replacereg this "^\s+|\s+$" "")}}![]({{replacereg this "^\s+|\s+$" ""}})

{{/if}}
{{/each}}

## Notes

![[{{wp_titre}}_notes]]

{{else}}
  {{#if (startsWith wp_categories "Vidéo")}}

## Vignette

{{#each (strsplit wp_img_url "||")}}
{{#if (replacereg this "^\s+|\s+$" "")}}![]({{replacereg this "^\s+|\s+$" ""}})

{{/if}}
{{/each}}

## Vidéo

![{{wp_titre}}]({{wp_a_videolink_gen}})

## Notes

![[{{wp_titre}}_notes]]

  {{/if}}
{{/if}}

```

---

## 3) 🛠️ helpers.js

```js
// helpers.js — pour Obsidian CSV/JSON Importer
// Contient les helpers personnalisés utilisés dans le template Handlebars.

// -------------------------------------------------------------
// Helper 1 : slugify_wp — normalise à la manière WordPress
// -------------------------------------------------------------
function hb_slugify_wp() {
  const orig = String(arguments[0] ?? '');
  let s = orig.toLowerCase();                             // minuscules
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // supprime accents
  s = s.replace(/'/g, '');                                // supprime apostrophes
  s = s.replace(/\s*-\s*/g, '-');                        // " - " → "-"
  s = s.replace(/\s+/g, '-');                             // espaces → "-"
  s = s.replace(/[^a-z0-9-]/g, '');                       // garde a-z0-9-
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');        // nettoie les doubles/trailing tirets
  return s;
}
handlebars.registerHelper('slugify_wp', hb_slugify_wp);

// -------------------------------------------------------------
// Helper 2 : startsWith — test de préfixe
// -------------------------------------------------------------
function startsWith() {
  const hay = String(arguments[0] ?? '');
  const needle = String(arguments[1] ?? '');
  return hay.startsWith(needle);
}
handlebars.registerHelper('startsWith', startsWith);
```

---

## Processus (rappel)

| Action | Requis | Commentaire |
|---|---|---|
| Exporter un CSV de WordPress | Plugin **WP Import Export Lite** (preset « Tous les articles ») | Voir description des presets d'export pour détail des champs. |
| Ouvrir Obsidian | Obsidian | — |
| Ouvrir **CSV/JSON Importer** | Plugin | — |
| Choisir le CSV | Fichier exporté | — |
| Choisir le **Template Handlebars** | Fichier `.md` | Aligner avec ce document. |
| Choisir le **helpers.js** | Fichier `.js` | Fournit `slugify_wp`, `startsWith`. |
| Lancer la création | — | — |

---

## Logs

### 🗓️ 2025-10-08 — Corps conditionnel + helper
- **Corps conditionnel selon `wp_categories`** :
  - Si ça commence par **Photo** → section **Photos** (galerie de toutes les `wp_img_url`).
  - Si ça commence par **Vidéo** → sections **Vignette** (galerie) + **Vidéo** (lien YouTube), puis **Notes**.
- **Ajout du helper `startsWith`** dans `helpers.js` pour gérer ces conditions.

### 🗓️ 2025-10-08 — Lien projets & galerie
- **`lien_projet`** : alimenté automatiquement depuis `wp_categories` en **liens internes** non‑slugifiés `[[Nom]]`.
- **Photos** : remplacement de l’ancienne section par une **galerie verticale** de toutes les images.

### 🗓️ 2025-10-09 — Qualité & suivi
- **`wp_correction`** (checkbox) ajouté par défaut à `false` pour marquer les notes à corriger côté WP.
- **Normalisations validées** : tags fusionnés (tags+catégories) slugifiés, `prod_diff` en ISO, `wp_img_id` en chaînes, séparateurs corrects (tags=`,` / catégories=`>` / images=`||`).

### 🗓️ 2025-10-10 — v2
- Séparation des usages : vault **“site”** (WP ⇄ Obsidian) vs **“portfolio/CV”** (présentation).
- **Suppression** des champs orientés CV du YAML/Template.
- **Ajouts/renommages** : `post_date` (ex-`prod_diff`), `post_modified` (ex-`wp_date_modified`).
- Conservation de la logique **Tags fusion** (tags+catégories) et du **corps Photo/Vidéo**.