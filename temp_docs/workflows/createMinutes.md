# Workflow — Création d'une note Minutes

## Objectif
Documenter l'action `createMinutes()` (`src/actions/createMinutes.ts`) qui guide l'utilisateur dans la génération d'une note *Minutes* complète à partir d'un nom de fichier vidéo et d'un lien de diffusion.

## Résumé exécutif
1. **Collecte des entrées** : ouverture d'une modale pour récupérer le nom du fichier vidéo et l'URL correspondante.
2. **Validation stricte** : contrôle du format du fichier (pattern `AAAA-MM-JJ-hh-mm - …`) et de l'URL vidéo (`https://`).
3. **Dérivation des métadonnées** : extraction de la date ISO, des titres (`post_titre_1`, `post_titre_2`, `post_titre_full`) et du nom de l'image associée (`buildMinutesImageFilename`).
4. **Construction du YAML maître** : initialisation des champs via `createEmptyMasterFields()` puis sérialisation avec `buildYamlMaster(master, "minutes")`.
5. **Génération du corps** : sections Markdown standardisées (vignette, embed vidéo, lien vers les notes).
6. **Écriture de la note** : création du fichier Obsidian avec `createNoteFile()` puis notification de succès ou d'échec.

## Pré-requis
- L'utilisateur doit disposer du nom exact du fichier vidéo (nommage standardisé) et du lien de diffusion.
- Les utilitaires `validationUtils`, `dateUtils`, `titleUtils` et `imageUtils` sont disponibles et cohérents avec les règles de nommage.
- L'adaptateur Obsidian doit autoriser la création de fichiers dans le dossier courant (gestion via `createNoteFile`).

## Entrées & sorties principales
| Élément | Description |
| --- | --- |
| `app` | Instance Obsidian pour accéder au vault et afficher notices/modales. |
| Modale Minutes | Retourne `{ videoFilename, videoLink }` ou `null` si annulation. |
| Retour | `Promise<void>` – effet principal : création d'un fichier Markdown + notice utilisateur. |

## Déroulé détaillé
### 1. Ouverture de la modale
- `openMinutesModal(app)` instancie `MinutesModal`, configure deux champs texte et les boutons « Annuler » / « Créer ».
- En fermeture positive, la modale trim les valeurs et les renvoie.

### 2. Validations
- `validateFilenameFormat(videoFilename)` : vérifie le respect du format (`AAAA-MM-JJ-hh-mm - Titre…`).
- `validateVideoLink(videoLink)` : impose un lien HTTPS valide (YouTube, Vimeo…).
- Échec → `Notice` dédiée (message contextualisé) et sortie immédiate.

### 3. Extraction des métadonnées
- `extractIsoDateFromFilename(videoFilename)` → `post_date` (ISO `YYYY-MM-DD`).
- `extractTitleFromFilename(videoFilename)` → `post_titre_1`.
- `formatDateToFrench(postDate)` → `post_titre_2` (texte long en français).
- `buildFullTitle(postTitre1, postTitre2)` → `post_titre_full` (utilisé pour le nom du fichier).
- `buildMinutesImageFilename(videoFilename)` → nom d'image `.webp` associé.

### 4. Construction du YAML maître
- Base : `createEmptyMasterFields()`.
- Champs spécifiques Minutes remplis : cover, images (`img_*`), liens projet (`[[Vidéo]]`, `[[Minutes]]`), catégories (`video`, `minutes`), date/modification identiques, lien vidéo, etc.
- `maj_wp` forcé à `true` (création locale).
- Sérialisation : `buildYamlMaster(master, "minutes")` produit le bloc `---`.

### 5. Corps Markdown
- Composition fixe :
  ```markdown
  ## Vignette
  ![[<image>]]

  ## Vidéo
  ![](<url>)

  ## Notes
  ![[<titre_full>_notes]]
  ```

### 6. Création du fichier
- `createNoteFile(app.vault, postTitreFull, yaml, body)` gère unicité et écriture du fichier `postTitreFull.md`.
- Succès → `Notice` « Note Minutes créée » + nom du fichier.
- Erreur → log console + `Notice` d'échec (message détaillé).

## Articulation avec la couche UI
- Commande palette (dans `main.ts`/`commands`) déclenche `createMinutes(app)`.
- Notices guident l'utilisateur tout au long du flux ; aucune interaction supplémentaire après la création.

## Points de vigilance
- Le format du nom vidéo doit inclure date + titre, sinon les extractions échouent (notice + arrêt).
- Le titre complet devient le nom de fichier : collisions gérées par `createNoteFile`, mais un titre identique existant déclenchera un suffixe selon l'implémentation de ce service.
- Toute évolution du schéma YAML Minutes doit être reportée ici (champs pré-remplis).

## Extensions possibles
- Prévisualisation de la vignette/vidéo dans la modale avant validation.
- Ajout d’un champ optionnel pour renseigner `tags` ou d’autres métadonnées au moment de la création.
- Support d’un mode « brouillon » (création dans un dossier différent ou avec `maj_wp: false`).
