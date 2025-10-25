---
doc_id: action_journal
rAwUrl: https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/ACTION-creer_une_note_journal.md
titre_palette: "Créer une note Journal"
type_doc: action
version: v1
date_maj: 2025-10-19
etat: courant
---

# ACTION — Créer une note Journal

## tl,dr
- Saisie **Nom de dossier** et **Nom de l’image** → dérivations automatiques de `post_date`, `post_titre_1`, `post_titre_2` (**Journal du …**), `post_titre_full`.
- Génération du **YAML maître** complet (séparateurs standard), avec `maj_wp: true` et `post_cat: [photo, journal-photo]`.
- **Nom du fichier** = `post_titre_full`. **Corps** minimal : `## Photo` + `![[img_filename]]`, puis `## Notes` + wikilink vers la note compagnon `_notes`.
- Liens utiles dérivés depuis `post_titre_full` : `lien_archives` et `lien_restes` (règles de ponctuation et libellés).
- État au **2025-10-19** : doc calé sur le template commun; rappel des validations et dérivations clés.

## Description

### 1. Entrées demandées à l’utilisateur

Lors du déclenchement de l’action “Créer une note Journal”, une fenêtre demande 2 éléments essentiels :

1. **Nom du dossier**  
    Exemple :  
    `2024-11-23-17-05 - Cinéma Saint-André des Arts. Paris 6e.`  
    → Ce nom doit toujours suivre la structure :  
    **année-mois-jour-heure-minute – titre complet.**  
    (avec le tiret entouré de 2 espaces “ - ” séparant la date et le titre).

2. **Nom de l'image**  
    Exemple :  
    `2024-11-23-17-05_4075037_WP.webp`
    → Ce nom doit toujours suivre la structure :
    **année-mois-jour-heure-minute_idPhoto_WP.webp

> [!warning] ATTENTION !
> idPhoto peut contenir `-` ou `_` 
> pour le code, toujours utiliser, le `premier _` ou le `dernier _` comme références, qui sont constantes.

_(Les tags ne sont pas saisis ici : ils seront ajoutés manuellement dans la note après sa création.)_

___
### 2. Structure de la note créée

Le titre de la note est créé automatiquement.
La note se compose de deux parties :  
un bloc d’informations (YAML) et un corps (contenu visible).
#### Nom du fichier .md

copie de `post_titre_full`

#### 🧾 Bloc d’informations FULL (YAML)

```yaml
---
cover:                # auto : copie de `Nom de l'image`

IMAGES: ______________________________________________________________________

img_alt:              # auto : copie de `post_titre_1`
img_descr:            # vide
img_filename:         # auto : copie de `Nom de l'image`
img_id:               # vide
img_legende:          # auto : copie de `post_titre_full`
img_titre:            # vide
img_url:              # vide

LIEN: ______________________________________________________________________

lien_archives:        # auto : lien wiki dérivé de 'post_titre_full'
lien_journal:         # vide
lien_projet:          # pré-rempli
  - "[[Photo]]"
  - "[[Journal photo]]"
lien_restes:          # auto : lien wiki dérivé de 'post_titre_full'

MAJ: ______________________________________________________________________

maj_wp: true         # pré-rempli: true

POST: ______________________________________________________________________

post_cat:             # pré-rempli - slug category
  - photo
  - journal-photo
post_date:           # auto : dérivé de `Nom de dossier`
post_descr:          # vide
post_extrait:        # vide
post_id:             # vide
post_mod:            # vide
post_perma:          # vide
post_titre_1:        # auto : dérivé de `Nom de dossier`
post_titre_2:        # auto : dérivé de `Nom de dossier`
post_titre_full:     # auto : concatène `post_titre_1` + ` ` + `post_titre_2`
post_vid_url:        # vide
tags:                # vide

WP: ______________________________________________________________________

wp_carnet_link:      # vide
wp_carnet_on:        # vide
wp_status:           # vide
---
```

##### Explications

###### lien_archives: # auto : lien wiki dérivé de 'post_titre_full'

- Utilise `post_titre_full`. 
- Remplacer les points, virgules, points d'exclamation par des points d'interrogation, avec un espace devant : ` ?`
- Mettre en majuscule le premier caractère après un `?`
- Remplacer `Journal` par `Archives`

``
> [!example] Exemple
> `post_titre_full`: `Lampadaire, toile d'araignée. Journal du dimanche 26 janvier 2024.`
> 
> `lien_archives`: `[[Lampadaire ? toile d'araignée ? Archives du dimanche 26 janvier 2024 ?]]`


###### lien_restes: # auto : lien wiki dérivé de 'post_titre_full'       

- Utilise `post_titre_full`. 
- Remplacer les points, virgules, points d'exclamation par des points d'interrogation, avec un espace devant : ` ?`
- Mettre en majuscule le premier caractère après un `?`
- Remplacer `Journal` par `Restes`
``
> [!example] Exemple
> `post_titre_full`: `Lampadaire, toile d'araignée. Journal du dimanche 26 janvier 2024.`
> 
> `lien_archives`: `[[Lampadaire ? toile d'araignée ? Restes du dimanche 26 janvier 2024 ?]]`

###### post_date: # auto : dérivé de `Nom de dossier`

- Utiliser les 16 premiers caractères.
- `AAAA-MM-JJ-hh-mm - titre complet.` devient `AAAA-MM-JJThh:mm:00`

> [!example] Exemple
>  `Nom du dossier` : `2020-11-28-17-12 - Immeuble, ciel. Quai de la Seine, Paris 19e.`
>  
> `post_date`:  `2020-11-28T17:12:00`

###### post_titre_1: # auto : dérivé de `Nom de dossier`

- Utiliser tout après le séparateur " - " (espace, tiret, espace).
- Commence toujours par une majuscule, se termine toujours par un point.

> [!example] Exemple
> `Nom du dossier` : `2020-11-28-17-12 - Immeuble, ciel. Quai de la Seine, Paris 19e.`
> 
> `post_titre_1`: `Immeuble, ciel. Quai de la Seine, Paris 19e.`

###### post_titre_2: # auto : dérivé de `Nom de dossier`

- Commence par `Journal du ` (Journal du + espace)
- Utiliser les 16 premiers caractères pour transformer la date en langage naturel français. 
	- `AAAA-MM-JJ-hh-mm`: `jourSemaine JJ mois AAAA`
- Terminer par un point.

> [!example] Exemple
> `Nom du dossier` : `2020-11-28-17-12 - Immeuble, ciel. Quai de la Seine, Paris 19e.`
> 
> `post_titre_2`: `Journal du samedi 28 novembre 2020.`

##### 📄 Corps de la note

```
## Photo

![[img_filename]]

## Notes

![[`post_titre_full` + `_notes`]]

```

___

### 3. Exemple d’entrée et de résultat

#### Entrée de l’utilisateur

| Champ              | Valeur saisie                                       |
| ------------------ | --------------------------------------------------- |
| **Nom de dossier** | `2024-01-26-16-28 - Lampadaire, toile d'araignée.` |
| **Nom de l'image** | `2024-01-26_16_28_3109684_WP.webp`                  |


#### Résultat obtenu

**Nom du fichier créé**

`Lampadaire, toile d'araignée. Journal du dimanche 26 janvier 2024..md`

**Bloc YAML généré**

```yaml
---
cover: 2024-01-26_16_28_3109684_WP.webp

IMAGES: ______________________________________________________________________

img_alt: 
  - Lampadaire, toile d'araignée.
img_descr:
img_filename: 
  - 2024-01-26_16_28_3109684_WP.webp
img_id:
img_legende:
  - Lampadaire, toile d'araignée. Journal du dimanche 26 janvier 2024.
img_titre:  
img_url:

LIEN: ______________________________________________________________________

lien_archives: "[[Lampadaire ? Toile d'araignée ? Archives du dimanche 26 janvier 2024 ?]]"
lien_journal:
lien_projet:
  - "[[Photo]]"
  - "[[Journal photo]]"
lien_restes: "[[Lampadaire ? Toile d'araignée ? Restes du dimanche 26 janvier 2024 ?]]"

MAJ: ______________________________________________________________________

maj_wp: true

POST: ______________________________________________________________________

post_cat:
  - photo
  - journal-photo
post_date: 2024-01-26T16:28:00
post_descr:
post_extrait: 
post_id:
post_mod:
post_perma:
post_titre_1: Lampadaire, toile d'araignée.
post_titre_2: Journal du dimanche 26 janvier 2024.
post_titre_full: Lampadaire, toile d'araignée. Journal du dimanche 26 janvier 2024.
post_video_url:
tags:

WP: ______________________________________________________________________

wp_carnet_link:
wp_carnet_on:
wp_status:
---
```

**Corps de la note**

```
## Photo

![[2024-01-26_16_28_3109684_WP.webp]]

## Notes

![[Lampadaire, toile d'araignée. Journal du dimanche 26 janvier 2024._notes]]

```



### 4. DEV : services à utiliser
*notes : les noms des fichiers .ts de services sont à définir.*


**post_date:  # auto : dérivé de `Nom du fichier vidéo`**
*Utilisé également dans **`Action Minutes`***
- Dériver 16 premiers caractères AAAA-MM-JJ-hh-mm en AAAA-MM-JJThh:mm:00

**post_titre_2: # auto : dérivé de `Nom du fichier vidéo`**
*Base Utilisée également dans **`Action Minutes`** (sans ajout en début de phrase de `Journal du` ou  `Restes du` ou `Archives du`, et remplacement des `.`  `,` `;` `!` par `?`)*
- Utiliser les 16 premiers caractères, transformer la date en langage naturel français, terminer par un point.

**post_titre_1: # auto : dérivé de `Nom du fichier vidéo`**
*Utilisé également dans **`Action Minutes`***
- Utiliser tout après le séparateur " - " (espace, tiret, espace). Commence toujours par une majuscule, se termine toujours par un point.


## Roadmap v0 → v1
### ✅ Livré
- [x] Saisie des 2 champs avec validations de format — 2025-10-15
- [x] Dérivations : `post_date` ISO, `post_titre_1`, `post_titre_2` (**Journal du …**), `post_titre_full` — 2025-10-15
- [x] YAML maître complet avec séparateurs + `maj_wp: true` + `post_cat: [photo, journal-photo]` — 2025-10-15
- [x] Nom de fichier = `post_titre_full`; corps `## Photo` + `## Notes` — 2025-10-15
- [x] Règles `lien_archives` et `lien_restes` depuis `post_titre_full` — 2025-10-15

## Roadmap v1 → v2
### ✅ Livré
- [x] Mise au gabarit **ACTION_template.md** (frontmatter normalisé, tl,dr, roadmaps, logs) — 2025-10-19
### 🔜 À venir
- [ ] Prévisualisation avant création (mini dry-run) avec rendu des titres et des liens
- [ ] Paramètres de l’action (dossier par défaut, pré-remplissages, modes stricts) dans Settings
- [ ] Mutualisation renforcée des dérivations (date/titres) avec l’action **Minutes**
### 🧪 À évaluer
- [ ] Auto-création (optionnelle) de la note compagnon `_notes` si absente
- [ ] Garde-fous supplémentaires sur `idPhoto` pour cas `_`/`-` complexes
- [ ] Compat stricte Windows (caractères spéciaux dans titres/fichiers)
### ❌ Rejeté
- [ ] *(aucun pour l’instant)*

## Hors scope
- [EXIF] Extraire automatiquement la date de prise de vue pour proposer `post_date`
- [UX] Vérifier l’existence du fichier image dans la vault et afficher un badge d’état
- [Perf] Générer une vignette `.webp` si manquante et l’insérer automatiquement
- [DX] Pré-remplir “Nom de dossier” depuis la date système (pattern Journal)

## Logs
### 🗓️ 2025-10-19 — Mise au gabarit et clarifications
> Documentation de l’action adaptée au **template** unifié (frontmatter, tl,dr, roadmaps, logs). Clarification des règles de dérivation et des liens dérivés depuis `post_titre_full`.
- Dérivations: confirmées (`post_date`, `post_titre_1`, `post_titre_2`, `post_titre_full`)
- YAML: confirmé (séparateurs, `maj_wp: true`, `post_cat: [photo, journal-photo]`)
- Corps: confirmé (`## Photo` + image, `## Notes` + wikilink `_notes`)
- Liens: `lien_archives` / `lien_restes` depuis `post_titre_full`

### 🗓️ 2025-10-15 — Implémentation commande «Créer une note Journal» + correctifs
> Première version opérationnelle: commande, validations, dérivations, YAML maître, nommage fichier, corps de note.
- Commande: modale 2 champs («Nom de dossier», «Nom de l’image»)
- Validations: dossier `AAAA-MM-JJ-hh-mm - Titre…`, image `AAAA-MM-JJ-hh-mm_idphoto_WP.webp`
- Dérivations: `post_date` ISO; `post_titre_1`; `post_titre_2 = "Journal du <jour date>."` (sans heure); `post_titre_full`
- YAML: clés complètes + séparateurs (IMAGES/LIEN/MAJ/POST/WP); `maj_wp: true`; `post_cat: [photo, journal-photo]`
- Nom de fichier: `post_titre_full`; Corps: `## Photo` + `## Notes`

### 🗓️ 2025-10-15 — Correction libellé lien_projet
> Harmonisation du libellé de catégorie dans `lien_projet`.
- Remplacement `[[Journal Photo]]` → `[[Journal photo]]` (cohérence avec le reste du corpus)
