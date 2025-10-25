---
doc_id: action_importer_csv_wp  
rAwUrl: [https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/ACTION-importer_un_csv_de_wordpress.md] 
titre_palette: "Importer un CSV Wordpress"  
type_doc: action  
version: v0  
date_maj: 2025-10-22  
etat: courant
---

# ACTION — Importer un CSV WordPress

## tl,dr

- Importe un export **CSV WordPress** et crée/met à jour des notes **.md** dans un dossier choisi (défaut **NEW**), en appliquant le **YAML maître** et un **corps conditionnel** (Vignette/Vidéo/Notes).
- **Preview (dry-run)** avec compteurs fiables: **Créés**, **MAJ**, **Erreurs**, + détail des MAJ (**identiques** vs **modifiées**), et **Nombre d’entrées CSV (hors en-tête)**.
- **Règles clés**: `post_titre_full = wp_titre`, `post_id = wp_id`, `maj_wp = false`, erreurs → **NEW/ERRORS** (note dédiée enrichie).
- **Anti-régression CSV v2**: nom de fichier `<dataset_key>_<dataset_id>_PG.csv`, bloc YAML **WP-IMPORT** écrit dans chaque note (`wp_import_dataset_key`, `wp_import_dataset_id`), blocage si CSV plus ancien.
- **Journal** automatique dans **NEW/LOGS/** avec récap et listes (wikilinks), et **sélecteur de dossier** dans la modale.
## Description

### Tableau — Mapping YAML maître ↔ Source (WordPress CSV) + Règles

| **YAML maître**                                                                | **Correspondance mapping source (CSV WordPress)** | **Règles (calcul / dérivation / modif)**                                                                                                                                                 |
| ------------------------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cover                                                                          | wp_img_url                                        | Prendre la **1ʳᵉ URL** si `wp_img_url` contient `\|`, sinon copier tel quel. `trim`.                                                                                                     |
| IMAGES: ______________________________________________________________________ | _(ligne de section – émise telle quelle)_         | _(aucune)_                                                                                                                                                                               |
| img_alt                                                                        | wp_img_alt                                        | Copier tel quel, `trim`. Si plusieurs valeurs séparées par `\|`, **convertir en liste YAML** (`- item`) avec `trim` de chaque élément.                                                   |
| img_descr                                                                      | wp_img_descr                                      | Copier tel quel, `trim`. Si plusieurs valeurs séparées par `\|`, **convertir en liste YAML** (`- item`) avec `trim` de chaque élément.                                                   |
| img_filename                                                                   | wp_img_filename                                   | Copier tel quel, `trim`. Si plusieurs valeurs séparées par `\|`, **convertir en liste YAML** (`- item`) avec `trim` de chaque élément.                                                   |
| img_id                                                                         | wp_img_id                                         | Copier tel quel, `trim`. Si plusieurs valeurs séparées par `\|`, **convertir en liste YAML** avec **chaque élément entre guillemets** (ex.: `- "12345"`).                                |
| img_legende                                                                    | wp_img_caption                                    | Copier tel quel, `trim`. Si plusieurs valeurs séparées par `\|`, **convertir en liste YAML** (`- item`) avec `trim` de chaque élément.                                                   |
| img_titre                                                                      | wp_img_titre                                      | Copier tel quel, `trim`. Si plusieurs valeurs séparées par `\|`, **convertir en liste YAML** (`- item`) avec `trim` de chaque élément.                                                   |
| img_url                                                                        | wp_img_url                                        | Copier tel quel, `trim`. Si plusieurs valeurs séparées par `\|`, **convertir en liste YAML** (`- item`) avec `trim` de chaque élément.                                                   |
| LIEN: ______________________________________________________________________   | _(ligne de section – émise telle quelle)_         | _(aucune)_                                                                                                                                                                               |
| lien_archives                                                                  | _(aucune colonne correspondante dans l’export)_   | Laisser vide.                                                                                                                                                                            |
| lien_journal                                                                   | _(aucune colonne correspondante dans l’export)_   | Laisser vide.                                                                                                                                                                            |
| lien_projet                                                                    | wp_categories                                     | **Names hiérarchiques**: `split('>')` → `trim` → **dédupliquer (ordre conservé)** → transformer chaque segment en **"[[Name]]"** (casse/accents conservés). Si vide ⇒ `lien_projet: []`. |
| lien_restes                                                                    | _(aucune colonne correspondante dans l’export)_   | Laisser vide.                                                                                                                                                                            |
| MAJ: ______________________________________________________________________    | _(ligne de section – émise telle quelle)_         | _(aucune)_                                                                                                                                                                               |
| maj_wp                                                                         | _(case à cocher calculée par l’action)_           | **Booléen**: toujours false                                                                                                                                                              |
| POST: ______________________________________________________________________   | _(ligne de section – émise telle quelle)_         | _(aucune)_                                                                                                                                                                               |
| post_cat                                                                       | wp_categories                                     | Convertir **names hiérarchiques** en **liste**: `split('>')` → `trim` → **dédupliquer (ordre conservé)**.                                                                                |
| post_date                                                                      | wp_date                                           | Remplacer l'espace par `T` (ex.: `YYYY-MM-DD HH:MM:SS` → `YYYY-MM-DDTHH:MM:SS`). Si seule la date est fournie, **ajouter** `T00:00:00`.                                                  |
| post_descr                                                                     | wp_a_descr_gen                                    | Copier tel quel, `trim`.                                                                                                                                                                 |
| post_extrait                                                                   | wp_extrait                                        | Copier tel quel.                                                                                                                                                                         |
| post_id                                                                        | wp_id                                             | Copier tel quel (clé d’**idempotence**).                                                                                                                                                 |
| post_mod                                                                       | wp_date_modified                                  | Remplacer l'espace par `T` (ex.: `YYYY-MM-DD HH:MM:SS` → `YYYY-MM-DDTHH:MM:SS`). Si seule la date est fournie, **ajouter** `T00:00:00`.                                                  |
| post_perma                                                                     | wp_perma                                          | Copier tel quel (URL absolue).                                                                                                                                                           |
| post_titre_1                                                                   | wp_a_titre_gen                                    | Copier tel quel. **Fallback**: dériver depuis `wp_titre` par split sur —, – ou : (partie gauche).                                                                                        |
| post_titre_2                                                                   | wp_a_stitre_gen                                   | Copier tel quel. **Fallback**: dériver depuis `wp_titre` par split sur —, – ou : (partie droite).                                                                                        |
| post_titre_full                                                                | wp_titre                                          | **Égal à** `wp_titre` (copie stricte).                                                                                                                                                   |
| post_vid_url                                                                   | wp_a_videolink_gen                                | Copier tel quel si URL valide, sinon laisser vide.                                                                                                                                       |
| tags                                                                           | wp_tags                                           | **Séparer** sur `,` → `trim` → **slugify_wp** (minuscules, sans accents, espaces→`-`) → **dédupliquer** (ordre conservé) → **liste YAML** (`- item`).                                    |
| WP: ______________________________________________________________________     | _(ligne de section – émise telle quelle)_         | _(aucune)_                                                                                                                                                                               |
| wp_carnet_link                                                                 | wp_carnet_link                                    | Copier tel quel (URL ou vide).                                                                                                                                                           |
| wp_carnet_on                                                                   | wp_carnet_on                                      | **Booléen** : **true** si la valeur source est **non vide** ; **false** si **vide**.                                                                                                     |
| wp_status                                                                      | wp_status                                         | Copier tel quel (`publish / pending / draft / …`).                                                                                                                                       |
### Règle — Peuplement de `lien_projet` depuis `wp_categories`

`lien_projet` est généré **directement** depuis `wp_categories` qui contient les **names** hiérarchisés par `>` : split sur `>`, trim, ignorer les vides, **conserver casse/accents**, **dédupliquer** en gardant l’ordre, transformer chaque segment en **"[[Name]]"** pour produire la liste YAML ; si `wp_categories` est vide/absent ⇒ `lien_projet: []`.

### Corps de la note

Pour toutes (si plusieurs entrées, prendre la 1ʳᵉ) :
```
## Vignette

![](wp_img_url)
```

Si `post_vid_url` existe (non vide) :

```
## Vidéo

![](wp_a_videolink_gen)
```

Pour toutes : 

```
## Notes

![[nomdelanote + _notes]]
```


#### Exemple 1, sans wp_a_videolink_gen
- titre de la note : Arbres, immeuble, nuit. Paris. Journal du mardi 2 janvier 2024.
- wp_img_url: https://www.pierregelas.fr/wp-content/uploads/2024/11/310_9142_2024-01-02_21h07_WP.webp

résultat : 

```
## Vignette

![](https://www.pierregelas.fr/wp-content/uploads/2024/11/310_9142_2024-01-02_21h07_WP.webp)

## Notes

![[Arbres, immeuble, nuit. Paris. Journal du mardi 2 janvier 2024._notes]]
```

#### Exemple 2, avec wp_a_videolink_gen
- titre de la note : Ravie et Raoûl glandent près de la fenêtre. Samedi 30 novembre 2024 à 17h51.
- wp_img_url: https://www.pierregelas.fr/wp-content/uploads/2025/06/2024-11-30-17-51_ravieetr_mvign.webp
- wp_a_videolink_gen: https://youtu.be/aEdyZYL0lWs

```
## Vignette

![](https://www.pierregelas.fr/wp-content/uploads/2025/06/2024-11-30-17-51_ravieetr_mvign.webp)

## Vidéo 

![](https://youtu.be/aEdyZYL0lWs)

## Notes

![[Ravie et Raoûl glandent près de la fenêtre. Samedi 30 novembre 2024 à 17h51._notes]]
```

### AJOUT : demander le chemin

Dans la modale, en haut, demander en liste déroulante (tous les dossiers existants dans la vault) où enregistrer les fichiers (défaut **NEW**, même s’il n’existe pas encore).

### AJOUT 2025-10-19 : système de vérification de la mise à jour

Principe: bloquer la mise à jour si le CSV choisi est **antérieur** à un import déjà effectué (basé sur le nom du fichier). Voir la section suivante pour la spécification finale.

Exemple : 
il y a : `2025-10-08-Articles-Minutes-PG.csv` et `2025-10-18-Articles-Minutes-PG.csv` dans la vault.
Si on essaye d'importer `2025-10-08-Articles-Minutes-PG.csv` alors que `2025-10-18-Articles-Minutes-PG.csv` a déjà été importé il faut bloquer la mise à jour (c'est une régression). 
Mais pour ça il faut également avoir créé un système qui enregistre avec quel csv la note a été créé ou modifiée non ? et donc modifier le yaml maître en introduisant des nouveaux champs ? 
parlons de la théorie pour l'instant de méthodologie simple, en langage naturel, pour définir le workflow le plus léger, le plus robuste, le plus mutualisant et n'étant pas basé sur une automaticité totale. 

- Nouveau format de csv : 
	- avant : 
		- 2025-10-08-Articles-Minutes-PG.csv
		- YYYY-MM-DD-<dataset_key>.csv
	- après : 
		- minutes-articles_20251008_PG.csv
		- `<dataset_key>_<dataset_id>_PG.csv`


De quoi on aurait besoin dans le yaml ?
```
WP-IMPORT: ______________________________________________________________________
wp_import_dataset_key:
wp_import_dataset_id:
```

à la création par l'action inscrit le <dataset_key> du csv dans wp_import_dataset_key: et <dataset_id> du csv dans wp_import_dataset_id: (yaml nombre)

>> pas besoin de 'transformer' l'id en date : juste comparer l'id, le plus grand est forcément le plus récent.

Exemple avec `minutes-articles_20251008_PG.csv` :
```
WP-IMPORT: ______________________________________________________________________
wp_import_dataset_key: minutes-articles
wp_import_dataset_id: 20251008
```

Si ensuite un fichier antérieur, comme `minutes-articles_20251002_PG.csv` est choisi à l'import : 

Comparaison dataset_key : ok, identique
Comparaison dataset_id : erreur, fichier antérieur, ne pas mettre à jour

### AJOUT 2025-10-19 — Système anti-régression (dataset_key / dataset_id)

**But.** Empêcher d’appliquer un CSV **plus ancien** que le dernier importé pour la **même famille**. On s’appuie sur le **nom du CSV** et sur **2 clés YAML par note** (pas de registre global).

**Convention de nom du CSV (strict).** `<dataset_key>_<dataset_id>_PG.csv`
- `dataset_key` : slug en minuscules, séparé par `-` (ex. `minutes-articles`)
- `dataset_id` : entier `YYYYMMDD` (8 chiffres)
- Exemple : `minutes-articles_20251018_PG.csv`
- Un nom non conforme est **refusé** en amont.

**YAML maître — nouveaux champs (écrits par l’action).**
Partie **WP-IMPORT** (écrite/MAJ uniquement par cette action) :

```
WP-IMPORT: ______________________________________________________________________
wp_import_dataset_key: <dataset_key>      # ex. minutes-articles
wp_import_dataset_id: <dataset_id>        # ex. 20251018 (nombre)

```

**Règle anti-régression (niveau dataset_key).**

- La modale affiche `CSV : <nom> — Famille : <dataset_key> — ID : <dataset_id>`
- La vault est scannée (frontmatter uniquement) pour récupérer le **max** de `wp_import_dataset_id` pour la même `wp_import_dataset_key`
- Cas:
    - `selected_id < max_id` → **BLOQUÉ** (bouton désactivé + message)
    - `selected_id = max_id` → **autorisé** (re-run), **warning** “même ID”
    - Aucun import connu pour cette famille → **autorisé**

**Notes.**

- - Deux exports le même jour ont le même `dataset_id`. Si besoin, passer à `YYYYMMDDHHmm` plus tard.
- Les anciennes notes sans bloc `WP-IMPORT` ne bloquent pas. Le “max” se calcule parmi celles qui l’ont.

**UI modale.**

- - Encart: `CSV : <nom> — Famille : <dataset_key> — ID : <dataset_id>`
- `Dernier import connu` si trouvé (ID + famille)
- Si régression: **alerte rouge** + bouton **Mettre à jour** désactivé

## Roadmap v0 → v1
### ✅ Livré
- [x] Sélecteur de CSV (fuzzy) avec **dry-run/preview** — 2025-10-17
- [x] Sélecteur de **dossier de sortie** (défaut `NEW`, même non-existant) — 2025-10-18
- [x] Récap modale: **Créés/MAJ/Erreurs** + **Nombre d’entrées (hors en-tête)** — 2025-10-18
- [x] Comptage **MAJ identiques** vs **MAJ modifiées** — 2025-10-18
- [x] Règles strictes: `post_titre_full = wp_titre`, `post_id = wp_id`, `maj_wp = false` — 2025-10-18
- [x] Gestion **erreurs**: notes dédiées enrichies (**NEW/ERRORS**) — 2025-10-18
- [x] **Journal .md** daté dans **NEW/LOGS/** + notice finale `+n, −m, ✖e` — 2025-10-18
- [x] **Corps conditionnel** (Vignette → Vidéo → Notes) — 2025-10-18
- [x] Règle `lien_projet` depuis `wp_categories` (séparateur `>`, wikilinks) — 2025-10-17
- [x] **Lecteur CSV robuste** (BOM, `sep=;`, auto-détection `;`/`,`) — 2025-10-22
- [x]  **Compteurs de preview corrigés** (créés/maj/erreurs + identiques/modifiées) — 2025-10-22
- [x]  **Émission YAML WP-IMPORT** dans chaque note (création/MAJ) — 2025-10-22
- [x]  **Garde anti-régression** tolérant ID numériques/chaînes, basé sur frontmatter — 2025-10-22
### 🔜 À venir
- [ ] Option d’exécution: **Créer seulement** / **MAJ seulement**
- [ ] **Paramètres** de l’action (dossier défaut, options de nommage, stricte Windows) dans Settings
- [ ] Pré-aperçu des **5 premiers titres** par section (Créés/MAJ/Erreurs) dans la modale
- [ ] Normalisation douce des **en-têtes CSV** (trim, BOM/insécables)
### 🧪 À évaluer
- [ ] Log “Modifiées”: afficher **par note** les champs **modifiés** avec **avant/après** (règles de troncature)
- [ ] Multi-sélection de **plusieurs CSV** (chaînage avec récap global)
- [ ] **Barre de progression** lors de l’import
- [ ] **Tests** unitaires/intégration (mapping, YAML, corps, I/O)
### ❌ Rejeté
- [ ] Fusion “tags+catégories (slugifiés)” en tags enrichis (option) — non pertinent pour cette action
- [ ] **Auto-quoting YAML** généralisé — écarté (on **nettoie la source** `post_descr` si HTML)

## Logs

### 🗓️ 2025-10-22 — Stabilisation Import v2 (compteurs, WP-IMPORT, anti-régression)

> La prévisualisation affiche désormais des totaux fiables; chaque note écrite contient le bloc WP-IMPORT; la régression est détectée et bloquée à partir du YAML des notes.

- CSV: prise en charge BOM/`sep=`/normalisation EOL; auto-détection `;`/`,`.
    
- Preview: compteurs `summary.created` / `summary.updated` / `summary.errors` + détail `summary.updated_identical` / `summary.updated_modified`.
    
- YAML: émission du bloc `WP-IMPORT` via `wp_import_dataset_key` (string) et `wp_import_dataset_id` (number).
    
- Garde: lecture de `wp_import_dataset_id` numérique **ou** string numérique; calcul du `latestId` par scan frontmatter; blocage si CSV plus ancien; warning si même ID.
    
- Journal: exécution consignée `[[import-20251022-120315]]`.
    

### 🗓️ 2025-10-18 — Preview enrichie, logs et corps de note

> La modale permet de choisir le dossier; la notice de fin récapitule +/−/×; le journal d’import est écrit; le corps (Vignette/Vidéo/Notes) est généré selon les données.

- Dossier: sélecteur avec défaut `NEW` (même s’il n’existe pas).
    
- Notice: résumé fin d’import `+n, −m, ×e`.
    
- Journal: création d’un `.md` daté dans `NEW/LOGS/` avec listes (créés/MAJ/erreurs) en wikilinks.
    
- Preview: affichage **Nombre d’entrées CSV (hors en-tête)**.
    
- MAJ: différenciation `identiques` vs `modifiées`.
    
- Erreurs: notes dédiées en `NEW/ERRORS` (ligne CSV, en-têtes, valeurs brutes); lignes vides marquées en erreur.
    
- Corps: sections **Vignette** (image), **Vidéo** (si URL), **Notes** (wikilink `_notes`).
    
- Règles: `post_titre_full = wp_titre`, `post_id = wp_id`, `maj_wp = false`.
    

### 🗓️ 2025-10-17 — Règles catégories/images

> Les catégories WP alimentent `lien_projet` en wikilinks; les champs images sont mappés en liste YAML si multiples.

- `lien_projet`: depuis `wp_categories` (names hiérarchisés par `>`), split/trim/dédup, rendu en `[[Name]]`.
    
- Images: `img_alt`, `img_descr`, `img_filename`, `img_id`, `img_legende`, `img_titre`, `img_url` → copie/trim; si multiples (`||`) → liste YAML.
    

### 🗓️ 2025-10-15 — Mise sur rails de l’action

> Première version fonctionnelle: génération YAML maître + squelette de note, nommage, et commande palette.

- Init: structure de commande et validations d’entrée.
    
- YAML: génération conforme au maître; squelette de note appliqué.
    
- Nommage: fichier = `wp_titre` avec sanitation définie; chemins de sortie configurables.