---
doc_id: action_minutes
rAwUrl: https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/ACTION_creer_une_note_minutes.md
titre_palette: "Créer une note Minutes"
type_doc: action
version: v1
date_maj: 2025-10-19
etat: courant
---

# ACTION — Créer une note Minutes

## tl,dr
- Saisie **Nom du fichier vidéo** + **Lien de la vidéo** → dérivations automatiques: `post_date`, `post_titre_1`, `post_titre_2` (FR «… à hhHmm.»), `post_titre_full`, `img_filename` (règle Minutes), `cover = img_filename`.
- Génération du **YAML maître** complet (séparateurs IMAGES/LIEN/MAJ/POST/WP), avec `maj_wp: true`, `post_cat: [video, minutes]`, `post_vid_url` ← copie du lien vidéo.
- **Nom du fichier** = `post_titre_full`. **Corps** standard: `## Vignette` (image), `## Vidéo` (URL), `## Notes` (wikilink `_notes`).
- Alignement des clés: utiliser **`post_vid_url`** (unique) pour l’URL vidéo dans tout l’écosystème.
- État au **2025-10-19**: doc calé sur le template commun; validations et dérivations confirmées.

## Description

### 1. Entrées demandées à l’utilisateur

Lors du déclenchement de l’action “Créer une note Minutes”, une fenêtre demande 2 éléments essentiels :

1. **Nom du fichier vidéo**  
    Exemple :  
    `2025-06-14-15-57 - Danse et manifestation, Place Léon Blum, Paris 11e.`  
    → Ce nom doit toujours suivre la structure :  
    **année-mois-jour-heure-minute – titre complet.**  
    (avec le tiret entouré de 2 espaces “ - ” séparant la date et le titre).

2. **Lien de la vidéo**  
    Exemple :  
    `https://youtu.be/hsELNvoyOnw`


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
cover:                # auto : copie de img_filename

IMAGES: ______________________________________________________________________

img_alt:              # auto : copie de `post_titre_1`
img_descr:            # vide
img_filename:         # auto : dérivé de `Nom de fichier vidéo`
img_id:               # vide
img_legende:          # auto : copie de `post_titre_full`
img_titre:            # vide
img_url:              # vide

LIEN: ______________________________________________________________________

lien_archives:        # vide
lien_journal:         # vide
lien_projet:          # pré-rempli
  - "[[Vidéo]]"
  - "[[Minutes]]"
lien_restes:          # vide

MAJ: ______________________________________________________________________

maj_wp: true         # pré-rempli: true

POST: ______________________________________________________________________

post_cat:             # pré-rempli - slug category
  - video
  - minutes
post_date:           # auto : dérivé de `Nom du fichier vidéo`
post_descr:          # vide
post_extrait:        # vide
post_id:             # vide
post_mod:            # vide
post_perma:          # vide
post_titre_1:        # auto : dérivé de `Nom du fichier vidéo`
post_titre_2:        # auto : dérivé de `Nom du fichier vidéo`
post_titre_full:     # auto : concatène `post_titre_1` + ` ` + `post_titre_2`
post_vid_url:        # auto : copie de `Lien de la vidéo`
tags:                # vide

WP: ______________________________________________________________________

wp_carnet_link:      # vide
wp_carnet_on:        # vide
wp_status:           # vide
---
```

##### Explications

##### img_filename: # auto : dérivé de `Nom de fichier vidéo`
Utiliser les 10 premiers caractères, enlever les tirets et agglomérer. 
Ajouter un `_`. 
Ajouter les 8 premiers caractères (hors espace, ponctuation et caractères spéciaux), passés en minuscule, du titre complet, soit après le séparateur " - " (espace, virgule, espace).
Ajouter `_mvign.webp`.

> [!example] Exemple
>  `Nom du fichier vidéo` : `2025-06-14-15-57 - Danse et manifestation, Place Léon Blum, Paris 11e.`
>  
> `img_filename`: `20250614_danseetm_mvign.webp`

###### post_date: # auto : dérivé de `Nom du fichier vidéo`

Utiliser les 16 premiers caractères.
`AAAA-MM-JJ-hh-mm - titre complet.` devient `AAAA-MM-JJThh:mm:00`

> [!example] Exemple
>  `Nom du fichier vidéo` : `2025-06-14-15-57 - Danse et manifestation, Place Léon Blum, Paris 11e.`
>  
> `post_date`:  `2025-06-14T15:57:00`

###### post_titre_1: # auto : dérivé de `Nom du fichier vidéo`

Utiliser tout après le séparateur " - " (espace, tiret, espace).
Commence toujours par une majuscule, se termine toujours par un point.

> [!example] Exemple
> `Nom du fichier vidéo` : `2025-06-14-15-57 - Danse et manifestation, Place Léon Blum, Paris 11e.`
> 
> `post_titre_1`: `Danse et manifestation, Place Léon Blum, Paris 11e.`

###### post_titre_2: # auto : dérivé de `Nom du fichier vidéo`
Utiliser les 16 premiers caractères, transformer la date en langage naturel français, terminer par un point.

> [!example] Exemple
> `Nom du fichier vidéo` : `2025-06-14-15-57 - Danse et manifestation, Place Léon Blum, Paris 11e.`
> 
> `post_titre_2`: `Samedi 14 juin 2025 à 15h57.`


##### 📄 Corps de la note

```
## Vignette

![[img_filename]]

## Vidéo

![](post_vid_url)

## Notes

![[`post_titre_full` + `_notes`]]

```

___

### 3. Exemple d’entrée et de résultat

#### Entrée de l’utilisateur

| Champ                    | Valeur saisie                                                            |
| ------------------------ | ------------------------------------------------------------------------ |
| **Nom du fichier vidéo** | `2025-06-14-15-57 - Danse et manifestation, Place Léon Blum, Paris 11e.` |
| **Lien vidéo**           | `https://youtu.be/hsELNvoyOnw`                                           |


#### Résultat obtenu

**Nom du fichier créé**

`Danse et manifestation, Place Léon Blum, Paris 11e. Samedi 14 juin 2025 à 15h57..md`

**Bloc YAML généré**

```yaml
---
---
cover: 20250614_danseetm_mvign.webp

IMAGES: ______________________________________________________________________

img_alt: 
  - Danse et manifestation, Place Léon Blum, Paris 11e.
img_descr:
img_filename: 
  - 20250614_danseetm_mvign.webp
img_id:
img_legende:
  - Danse et manifestation, Place Léon Blum, Paris 11e. Samedi 14 juin 2025 à 15h57.
img_titre:  
img_url:

LIEN: ______________________________________________________________________

lien_archives:
lien_journal:
lien_projet:
  - "[[Vidéo]]"
  - "[[Minutes]]"
lien_restes:

MAJ: ______________________________________________________________________

maj_wp: true

POST: ______________________________________________________________________

post_cat:
  - video
  - minutes
post_date: 2025-06-14T15:57:00
post_descr:
post_extrait: 
post_id:
post_mod:
post_perma:
post_titre_1: Danse et manifestation, Place Léon Blum, Paris 11e.
post_titre_2: Samedi 14 juin 2025 à 15h57.
post_titre_full: Danse et manifestation, Place Léon Blum, Paris 11e. Samedi 14 juin 2025 à 15h57.
post_video_url: https://youtu.be/hsELNvoyOnw
tags:

WP: ______________________________________________________________________

wp_carnet_link:
wp_carnet_on:
wp_status:
---
```

**Corps de la note**

```
## Vignette

![[20250614_danseetm_mvign.webp]]

## Vidéo

![](https://youtu.be/hsELNvoyOnw)

## Notes

![[Danse et manifestation, Place Léon Blum, Paris 11e. Samedi 14 juin 2025 à 15h57._notes]]
```



### 4. DEV : services à utiliser
*notes : les noms des fichiers .ts de services sont à définir.*

**img_filename: # auto : dérivé de `Nom de fichier vidéo`**
*Utilisé uniquement dans **`Action Minutes`***
- Utiliser les 10 premiers caractères, enlever les tirets et agglomérer. 
- Ajouter un `_`. 
- Ajouter les 8 premiers caractères (hors espace, ponctuation et caractères spéciaux), passés en minuscule, du titre complet, soit après le séparateur " - " (espace, virgule, espace).
- Ajouter `_mvign.webp`.

**post_date:  # auto : dérivé de `Nom du fichier vidéo`**
*Utilisé également dans **`Action Journal`***
- Dériver 16 premiers caractères AAAA-MM-JJ-hh-mm en AAAA-MM-JJThh:mm:00

**post_titre_2: # auto : dérivé de `Nom du fichier vidéo`**
*Base Utilisée également dans **`Action Journal`** avec modification (ajout en début de phrase de `Journal du` ou  `Restes du` ou `Archives du`, et remplacement des `.`  `,` `;` `!` par `?`)*
- Utiliser les 16 premiers caractères, transformer la date en langage naturel français, terminer par un point.

**post_titre_1: # auto : dérivé de `Nom du fichier vidéo`**
*Utilisé également dans **`Action Journal`***
- Utiliser tout après le séparateur " - " (espace, tiret, espace). Commence toujours par une majuscule, se termine toujours par un point.



## Roadmap v0 → v1
### ✅ Livré
- [x] Commande «Créer une note Minutes»: modale 2 champs avec validations (pattern + URL https) — 2025-10-14
- [x] Dérivations: `post_date` (16 premiers caractères → ISO), `post_titre_1` (après “ - ”, majuscule + point), `post_titre_2` (date FR «… à hhHmm.»), `post_titre_full` (concat) — 2025-10-14
- [x] `img_filename` (règle Minutes): `YYYYMMDD_` + 8 chars nettoyés du titre + `_mvign.webp`; `cover = img_filename` — 2025-10-14
- [x] YAML maître complet + séparateurs; `maj_wp: true`; `post_cat: [video, minutes]` — 2025-10-14
- [x] Corps: `## Vignette` + `## Vidéo` + `## Notes`; nom de fichier = `post_titre_full` — 2025-10-14

## Roadmap v1 → v2
### ✅ Livré
- [x] Mise au gabarit **ACTION_template.md** (frontmatter, tl,dr, roadmaps, logs) — 2025-10-19
### 🔜 À venir
- [ ] Preview (dry-run): affichage des valeurs dérivées avant création (titres, image, URL)
- [ ] Paramètres de l’action: dossier par défaut, options de nommage, compat strict Windows
- [ ] Validation renforcée du lien vidéo (détection d’URL non valides, feedback clair)
### 🧪 À évaluer
- [ ] Génération auto de la vignette `_mvign.webp` si manquante
- [ ] Métadonnées vidéo (titre/durée) en suggestion non bloquante
- [ ] Batch: création de plusieurs Minutes à partir d’une liste
### ❌ Rejeté
- [ ] Variantes multiples de la clé d’URL vidéo (`post_video_url`) — **rejeté** (standard: `post_vid_url`)

## Hors scope
- [DX] Script d’audit des Minutes (fichiers orphelins, vignettes manquantes)
- [UX] Badge d’état si `img_filename` absent dans la vault
- [Interop] Import de “Minutes” depuis un CSV externe sans créer la vidéo

## Logs
### 🗓️ 2025-10-19 — Mise au gabarit et clarifications
> Document aligné sur le **template** unifié; clarification de l’usage unique de `post_vid_url`.
- Dérivations confirmées (`post_date`, `post_titre_1`, `post_titre_2`, `post_titre_full`, `img_filename`, `cover`)
- YAML: séparateurs standard; `maj_wp: true`; `post_cat: [video, minutes]`
- Corps: `## Vignette` + `## Vidéo` + `## Notes`
- Clés: normalisation **`post_vid_url`** pour l’URL vidéo

### 🗓️ 2025-10-14 — Implémentation commande «Créer une note Minutes»
> Première version opérationnelle: commande, validations, dérivations, YAML maître, nommage fichier, corps.
- Modale 2 champs («Nom du fichier vidéo», «Lien de la vidéo»), validations (pattern + https)
- Dérivations: `post_date` (ISO), `post_titre_1`, `post_titre_2` (FR «… à hhHmm.»), `post_titre_full`
- Images: `img_filename` (règle Minutes), `cover = img_filename`
- YAML: clés complètes + séparateurs (IMAGES/LIEN/MAJ/POST/WP); `maj_wp: true`; `post_cat: [video, minutes]`
- Fichier: nom = `post_titre_full`; Corps: `## Vignette` + `## Vidéo` + `## Notes`
