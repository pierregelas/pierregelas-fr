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
- Met à jour ou crée une note **Restes du futur** à partir de la note **Journal** correspondante.
- Résolution: d’abord via `lien_restes`, sinon **fallback** par `post_date` + `post_cat` contient `restes-du-futur`.
- Diff(A): vérifie `post_date`, `tags` et coche **uniquement si différents**; Diff(B) conditionnelle si le **titre Journal** a changé.
- En cas de changement de titre, propose un **rename** (nom du fichier = nouveau `post_titre_full`).
- Si aucune différence: affiche une **modale d’information** “La note 'Restes du futur' est parfaitement à jour !”.

## Description
### 1. Explications

Aucune information n'est demandée à l'utilisateur.

**La création/Mise à jour est basée sur l'existence d'une note Journal.**
- Elle ne s'effectue que si elle est activée sur une note contenant `journal-photo` dans `post_cat`.
	- Sinon arrêt de l'action et `message d'alerte` : `Cette note n'est pas une note Journal Photo !`

Les informations sont toutes dérivées des informations déjà présentes dans la note Journal photo correspondante. Nous l'appellerons `Note journal source` dans ce document.

Les notes Journal photo et Archives correspondantes partagent un identifiant unique qui est la date et heure de post_date. Ce sont les seules à avoir cet id, et cela peut donc servir de vérification : 
Si la note contient en `lien_projet`: `Journal Photo`  et que sa `post_date:` `2024-01-26T16:28:00`, alors la note contenant `Archives du futur` en `lien_projet` et le même `post_date`: `2024-01-26T16:28:00` est son équivalent, et vice-versa.

### 2. Processus

2 cas de figures peuvent se présenter : 
- La note archives du futur, dont le lien wiki a été créé lors de la création de la `Note journal source` n'existe pas encore dans la vault : `Processus 1 : Création note Archives`
- La note archives du futur, dont le lien wiki a été créé lors de la création de la `Note journal source` existe déjà dans la vault : `Processus 2 : Mise à jour note Archives`

### 3. Processus 1 : Création note Archives

Le titre de la note est créé automatiquement.
La note se compose de deux parties :  
un bloc d’informations (YAML) et un corps (contenu visible).

Au niveau du processus, si c'était un humain qui faisait ça, il lui suffirait de :
- cliquer sur le lien wiki de `lien_archives` de la `note journal source`
- dans la note nouvellement créée remplir le yaml comme suit :
#### Nom du fichier .md

copie de `lien_archives` de `note journal source` 

#### 🧾 Bloc d’informations FULL (YAML)

```
---
cover:                # auto : copie de img_filename

IMAGES: ______________________________________________________________________

img_alt:              # auto : copie de `post_titre_1`
img_descr:            # vide
img_filename:         # auto : dérivé de `img_filename` de `note journal source`
img_id:               # vide
img_legende:          # auto : copie du titre de la note archives
img_titre:            # vide
img_url:              # vide

LIEN: ______________________________________________________________________

lien_archives:        # vide
lien_journal:         # auto : lien wiki de `note journal source`
lien_projet:          # pré-rempli
  - "[[Photo]]"
  - "[[Archives du futur]]"
lien_restes:          # auto : copie de `lien_restes` de `note journal source`

MAJ: ______________________________________________________________________

maj_wp: true         # pré-rempli: true

POST: ______________________________________________________________________

post_cat:             # pré-rempli - slug category
  - photo
  - archives-du-futur
post_date:         # auto : copie de `post-date` de `note journal source`
post_descr:        # vide
post_extrait:      # vide
post_id:           # vide
post_mod:          # vide
post_perma:        # vide
post_titre_1:      # auto : dérivé du titre de la note archives
post_titre_2:      # auto : dérivé du titre de la note archives
post_titre_full:   # auto : copie du titre de la note archives
post_vid_url:      # vide
tags:              # vide

WP: ______________________________________________________________________

wp_carnet_link:      # vide
wp_carnet_on:        # vide
wp_status:           # vide
---
```


##### Explications

###### img_filename:  # auto : dérivé de `img_filename` de `note journal source`
- utilise `img_filename` de `note journal source`
- remplace `_WP` par `_BF`

> [!example] Exemple
> `img_filename` de `note journal source`: `2024-01-26_16_28_3109684_WP.webp`
> 
> `img_filename`: `2024-01-26_16_28_3109684_BF.webp`

###### post_titre_1:  # auto : dérivé du titre de la note archives
- Utilise le titre de fichier de la note archives (relative à `lien_archives` de `note source journal`)
- Prends tout ce qui est AVANT le mot Archives, (en enlevant le dernier espace, doit terminer par un point)

> [!example] Exemple
> `titre de fichier de la note archives` : `Lampadaire ? Toile d'araignée ? Archives du dimanche 26 janvier 2024 ?`
> 
> `post_titre_1:` `Lampadaire ? Toile d'araignée ?`

###### post_titre_2:  # auto : dérivé du titre de la note archives
- Utilise le titre de fichier de la note archives (relative à `lien_archives` de `note source journal`)
- Prends tout ce qui est APRÈS le mot Archives (inclus).

> [!example] Exemple
> `titre de fichier de la note archives` : `Lampadaire ? Toile d'araignée ? Archives du dimanche 26 janvier 2024 ?`
> 
> `post_titre_2:` `Archives du dimanche 26 janvier 2024 ?`

##### 📄 Corps de la note

```
## Photo

![[img_filename]]

## Notes

![[`titre de la note archives` + `_notes`]]

```


___

### 4. Exemple d’entrée et de résultat Processus 1 

#### Entrée de la note Journal photo

**Bloc YAML**

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

#### Résultat obtenu

**Nom du fichier créé**

**Bloc YAML généré**

```yaml
---
cover: 2024-01-26_16_28_3109684_BF.webp

IMAGES: ______________________________________________________________________

img_alt: 
  - Lampadaire ? toile d'araignée ?
img_descr:
img_filename: 
  - 2024-01-26_16_28_3109684_BF.webp
img_id:
img_legende:
  - Lampadaire ? toile d'araignée ? Archives du dimanche 26 janvier 2024 ?
img_titre:  
img_url:

LIEN: ______________________________________________________________________

lien_archives:
lien_journal: [[Lampadaire, toile d'araignée. Journal du dimanche 26 janvier 2024.]]
lien_projet:
  - "[[Photo]]"
  - "[[Archives du futur]]"
lien_restes: "[[Lampadaire ? Toile d'araignée ? Restes du dimanche 26 janvier 2024 ?]]"

MAJ: ______________________________________________________________________

maj_wp: true

POST: ______________________________________________________________________

post_cat:
  - photo
  - archives-du-futur
post_date: 2024-01-26T16:28:00
post_descr:
post_extrait: 
post_id:
post_mod:
post_perma:
post_titre_1: Lampadaire ? Toile d'araignée ?
post_titre_2: Archives du dimanche 26 janvier 2024 ?
post_titre_full: Lampadaire ? Toile d'araignée ? Archives du dimanche 26 janvier 2024 ?
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

![[2024-01-26_16_28_3109684_BF.webp]]

## Notes

![[Lampadaire ? Toile d'araignée ? Archives du dimanche 26 janvier 2024 ?_notes]]

```


### 5. Processus 2 : Mise à jour de note archives

Pour l'instant, si la note Archives est déjà créé, on arrête l'action avec le message : `La note Archives du futur est déjà créé !`

Là j'ai besoin de toi chatgpt pour définir les choses.

L'objectif : mettre à jour les informations essentielles et communes d'une note archives en fonction de la note source journal.
- Les informations communes : 
	- post_date: la note archives a TOUJOURS la même post-date que la note journal source
	- tags: la note archives a TOUJOURS la même liste yaml tags que la note journal source
Ce que je veux : 
- Si la note est déjà créé il faut donc analyser le contenu des 2 notes (note journal source et note archives correspondante).
- Il faut donc afficher une fenêtre modale qui va afficher la diff entre les deux fichiers, accompagné de boutons `mettre à jour` ou `annuler`
- Les choses à vérifier pour la diff, cas de figures : 
	- Le post_date de la note journal source a changé :
		- la copier sur archives
	- les tags de la note journal source ont changé :
		- remplacer exactement les tags dans la note archives
	- Le titre de la note source journal a changé (la dérivation du titre de la note source journal ne donne plus la même chose que le titre de la note archives à mettre à jour)
		- vérfier/redériver  les informations :
			- vérifier/recréer le lien_archives dans la note source journal : il doit être dérivé du titre selon la méthode déjà implémentée
			- à partir de lien_projet vérifier/modifier toutes les dérivations dans la note archives.
Il ya peut-être des choses que j'oublie, dis-moi ce que tu en penses. 
ce processus de mise à jour doit être robuste, léger, et clair. 


#### spécification finale – Processus 2 (Mise à jour d’une note “Archives du futur”) rédigée par chatgpt

#### 🎯 Objectif

Depuis une **note Journal photo** ouverte, si la note **Archives du futur** liée **existe déjà**, proposer une **mise à jour contrôlée** (via une modale de diff) de quelques champs **communs/invariants** et, **si et seulement si** le titre Journal a changé, **recalculer** les dérivations côté Archives pour conserver la cohérence avec le Processus 1.

##### ✅ Préconditions (hard stop si KO)

- La note courante est une **note Journal photo** → `post_cat` contient `journal-photo`.
    
- Le champ `lien_archives` de la note Journal **pointe vers une note existante** (titre = texte du lien sans `[[ ]]`).
    

##### 🧭 Sélection des deux notes (source/target)

- **Source** = note Journal (active).
    
- **Target (Archives)** = d’abord par `lien_archives` (texte sans `[[ ]]`), sinon **fallback** par recherche d’une note avec `post_cat` contenant `archives-du-futur` **et** `post_date` identique à la source.
    

##### 🧩 Champs concernés par P2 (seulement)

###### Bloc A — **Toujours proposés à synchroniser**

- `post_date` (Archives ← Journal).
    
- `tags` (Archives ← Journal, **remplacement total**).
    

###### Bloc B — **Proposés si le titre Journal a changé**

_(i.e. si le `lien_archives` recalculé à partir du nouveau `post_titre_full` Journal diffère du texte actuel)_

- **Titres Archives** (re-dérivés depuis le **nouveau** `lien_archives` côté Journal, mêmes règles que P1)
    
    - `post_titre_1` = partie **avant** “Archives” **sans ajouter de point** si déjà terminé par `?`/`!`.
        
    - `post_titre_2` = partie **depuis** “Archives” (inclu), ex. `Archives du dimanche 26 janvier 2024 ?`.
        
    - `post_titre_full` = **identique** au **texte du nouveau lien**.
        
- **Image & cover**
    
    - `img_filename` = image Journal avec `_WP.webp` → `_BF.webp`.
        
    - `cover` = copie de `img_filename`.
        
    - `img_alt` = **`post_titre_1` des Archives**.
        
    - `img_legende` = **`post_titre_full` des Archives**.
        
    - `img_descr`, `img_id`, `img_titre`, `img_url` restent **vides**.
        
- **Liens**
    
    - `lien_journal` = `[[post_titre_full du Journal]]`.
        
    - `lien_restes` = copie depuis la note Journal.
        
    - `lien_archives` = **vide** (on est dans Archives).
        
    - `lien_projet` = `[[Photo]]`, `[[Archives du futur]]`.
        

##### 🪟 Modale de diff (UX)

- **En-tête**: “Mettre à jour la note ‘Archives du futur’ liée à cette note Journal ?”
    
- **Section A — Champs communs** (checkbox cochées par défaut)
    
    - `post_date` (Source → Target, montrer ancienne/nouvelle valeur).
        
    - `tags` (liste → liste, montrer diff simple).
        
- **Section B — Titre modifié** _(rendue visible uniquement si le `lien_archives` recalculé ≠ actuel)_
    
    - Titres à jour (`post_titre_1/2/full`).
        
    - Image/cover/alt/légende.
        
    - Liens (`lien_journal`, `lien_restes`, `lien_archives` vide, `lien_projet`).
        
- **Pied**:
    
    - Bouton **Mettre à jour** (applique **uniquement** les cases cochées).
        
    - Bouton **Annuler** (aucun changement).
        

##### 🔃 Ordre de mise à jour (atomique, minimal)

1. **Recalcule éventuel** du `lien_archives` côté Journal (en mémoire, sans modifier la note Journal dans P2).
    
2. **Résolution de la note Archives** (via lien, fallback par `post_date`).
    
3. **Constitution de la diff** (Bloc A toujours, Bloc B seulement si titre changé).
    
4. **Si “Mettre à jour”**:
    
    - Appliquer d’abord **Bloc A** (`post_date`, `tags`).
        
    - Puis **Bloc B** si coché (titres, image, liens).
        
    - **Rename de fichier** si le **nouveau `post_titre_full`** ≠ **nom de fichier actuel**: renommer le `.md` des Archives au **texte du nouveau lien** (Obsidian met à jour les backlinks automatiquement).
        
5. Ne **rien toucher** aux autres champs (`post_descr`, `post_extrait`, `post_id`, `post_mod`, `post_perma`, `wp_*`, corps, etc.).
    

##### 🧪 Critères d’acceptation

- Si `post_cat` (source) ≠ `journal-photo` → message clair, **aucune modification**.
    
- Si la note Archives est introuvable → message clair, **aucune modification**.
    
- Si aucune différence n’est détectée dans les blocs cochés → message “Rien à mettre à jour”.
    
- Après mise à jour:
    
    - `post_date` et `tags` d’Archives = **copie exacte** de Journal.
        
    - Si Bloc B appliqué: `post_titre_*`, `img_*`, `cover`, `lien_*` d’Archives = **cohérents Processus 1**.
        
    - Si renommage: nom de fichier d’Archives = **nouveau `post_titre_full`**, liens internes OK.
        

##### 🧯 Cas limites & garde-fous

- Si plusieurs notes Archives partagent le **même `post_date`** (cas pathologique): afficher un **sélecteur** dans la modale pour choisir la cible.
    
- Si l’image Journal ne suit plus la norme `_WP.webp`, la conversion `_BF` est **skippée** et signalée (non bloquant).
    
- Toute erreur I/O → message + **aucun changement** partiel (appliquer les mises à jour de manière groupée).


## Roadmap v0 → v1
### ✅ Livré
- [x] Résolution par `lien_restes` avec fallback `post_date` + `post_cat: restes-du-futur` — 2025-10-15
- [x] Diff(A): comparaison `post_date`, `tags` (cases cochées uniquement si différents) — 2025-10-15
- [x] Diff(B) conditionnelle si le **titre Journal** change: `post_titre_1/2/full` (mot-clé **Restes**), `img_filename` **(_REI_)** + `cover`, `img_alt`, `img_legende`, `lien_journal`, `lien_archives` — 2025-10-15
- [x] **Rename** proposé si `post_titre_full` change (nom de fichier = nouveau titre) — 2025-10-15
- [x] Message “**zéro différence**” (modale d’information) — 2025-10-15

## Roadmap v1 → v2
### ✅ Livré
- [x] Mise au gabarit **ACTION_template.md** (frontmatter, tl,dr, roadmaps, logs) — 2025-10-19
### 🔜 À venir
- [ ] Prévisualisation (dry-run) listant précisément les champs qui vont changer
- [ ] Journal détaillé des **champs modifiés** (avant/après avec troncature maîtrisée)
- [ ] Paramètres de l’action (options de rename, strict Windows, seuils de troncature) dans Settings
### 🧪 À évaluer
- [ ] Détection/alerte si l’image **REI** référencée est manquante dans la vault
- [ ] Batch: mise à jour multi-notes Restes à partir d’un filtre (plage de dates, tag)
- [ ] Stratégie de merge si la note Restes a du contenu **manuel** non dérivé (zones protégées)
### ❌ Rejeté
- [ ] Génération automatique de la note Journal depuis Restes (flux inversé) — non souhaité

## Hors scope
- [DX] Explorer un **rapport** de synchronisation (tableau des différences) exportable en `.md`
- [UX] Indicateurs visuels dans la modale (icônes “titre modifié”, “image remplacée”)
- [Perf] Caching temporaire des métadonnées Journal pour accélérer les mises à jour groupées
- [Interop] Option de lecture d’un **CSV des Restes** (audit) sans import

## Logs
### 🗓️ 2025-10-19 — Mise au gabarit et clarifications
> Documentation de l’action adaptée au **template** unifié (frontmatter, tl,dr, roadmaps, logs) et clarification des règles Diff(A/B), rename, zéro-différence.
- Résolution: inchangée (priorité `lien_restes`, fallback `post_date` + `post_cat` contient `restes-du-futur`)
- Diff (A): `post_date`, `tags` (cases cochées **seulement** si différents)
- Diff (B): si le titre Journal a changé → `post_titre_1/2/full` (**Restes**), `img_filename` **(_REI_)** + `cover`, `img_alt`, `img_legende`, `lien_journal`, `lien_archives`
- Rename: proposé si `post_titre_full` change
- Zéro différence: modale d’information

### 🗓️ 2025-10-15 — Processus 2 (mise à jour Restes du futur)
> Mise à jour automatique des notes “Restes du futur” à partir des **Journaux**: on vérifie la date et les tags, on recopie les infos si le titre a changé, sinon on confirme que tout est déjà à jour.
- Résolution: via `lien_restes` ou fallback par `post_date` + `post_cat` contient `restes-du-futur`
- Diff (A): `post_date`, `tags` (cases cochées **seulement** si différents)
- Diff (B), si le titre Journal a changé: `post_titre_1/2/full` (mot-clé **Restes**), `img_filename` **(_REI_)** + `cover`, `img_alt`, `img_legende`, `lien_journal`, `lien_archives` (copié depuis Journal); cases cochées **seulement** si différents
- Rename: proposé si `post_titre_full` change (nom de fichier = nouveau titre)
- Zéro différence: modale d’information « La note “Restes du futur” est parfaitement à jour ! »
