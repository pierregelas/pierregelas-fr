# Workflow — Création d'une note Journal Photo
_Last updated: 2025-10-24 — Plugin v0.6.0_

## Objectif
Décrire l'action `createJournal()` (`src/actions/createJournal.ts`) qui fabrique une note *Journal Photo* complète à partir d'un nom de dossier horodaté et d'un nom de fichier image WordPress.

## Résumé exécutif
1. **Collecte utilisateur** : ouverture d'une modale demandant le « Nom de dossier » (format horodaté) et le fichier image WP (`…_WP.webp`).
2. **Validation des entrées** : vérification du pattern du dossier (`AAAA-MM-JJ-hh-mm - …`) et du nom d'image (`AAAA-MM-JJ-hh-mm_id_WP.webp`).
3. **Extraction des métadonnées** : dérivation de la date ISO (`post_date`) et des titres (`post_titre_1`, `post_titre_2`, `post_titre_full`) via `deriveJournalTitlesFromFilename()`.
4. **Liens croisés** : génération des titres « Archives du futur » et « Restes du futur » correspondants (`buildArchivesLinkTitle`, `buildRestesLinkTitle`).
5. **Construction du YAML maître** : initialisation par `createEmptyMasterFields()`, remplissage des champs spécifiques Journal puis sérialisation `buildYamlMaster(master, "journal")`.
6. **Corps Markdown** : sections standardisées (photo + notes associées).
7. **Création de la note** : `createNoteFile()` écrit la note et affiche une notice de confirmation ou d'échec.

## Pré-requis
- Convention de nommage stricte pour les dossiers et images fournie par WordPress.
- Services utilitaires disponibles : `validationUtils`, `dateUtils`, `journalUtils`, `fileUtils`.
- Droits d’écriture dans le vault (gérés par `createNoteFile`).

## Entrées & sorties principales
| Élément | Description |
| --- | --- |
| `app` | Instance Obsidian. |
| Modale Journal | Résultat `{ folderName, imageName }` ou `null` si annulation. |
| Retour | `Promise<void>` – effets secondaires : création de `post_titre_full.md`, notices utilisateur. |

## Déroulé détaillé
### 1. Saisie via modale
- `openJournalModal(app)` instancie `JournalModal` avec deux champs texte.
- Bouton « Créer » réalise une validation instantanée avant de fermer avec les valeurs trimées.

### 2. Validation
- `validateFilenameFormat(folderName)` garantit la structure horodatée.
- Expression régulière `IMG_RE` contrôle le suffixe `_WP.webp` et la structure `AAAA-MM-JJ-hh-mm_id_WP.webp`.
- Échecs → `Notice` et sortie immédiate.

### 3. Calcul des champs principaux
- `extractIsoDateFromFilename(folderName)` → `post_date`.
- `deriveJournalTitlesFromFilename(folderName)` → `post_titre_1` (titre brut), `post_titre_2` (Journal du …), `post_titre_full` (concat).
- `buildArchivesLinkTitle(postTitreFull)` & `buildRestesLinkTitle(postTitreFull)` → liens wikilinks pour futurs couples.

### 4. Préparation du YAML maître
- `createEmptyMasterFields()` fournit la base.
- Champs spécifiques Journal : cover/image (`img_*`), catégories (`photo`, `journal-photo`), liens projet `[[Photo]]` & `[[Journal Photo]]`, `lien_archives`/`lien_restes`, etc.
- `maj_wp` est fixé à `true`, `post_id` vide (création locale).
- `buildYamlMaster(master, "journal")` sérialise le frontmatter.

### 5. Corps Markdown
- Template :
  ```markdown
  ## Photo
  ![[<image>]]

  ## Notes
  ![[<titre_full>_notes]]
  ```
- Permet d'afficher la photo WP et un lien vers la note de prise de notes.

### 6. Écriture du fichier
- `createNoteFile(app.vault, postTitreFull, yaml, body)` crée (ou renomme) la note.
- Notice de succès mentionnant le nom final ; en cas d'erreur → log console + notice d'échec.

## Articulation avec la couche UI
- La commande palette expose « Créer une note Journal » qui appelle `createJournal(app)`.
- Les notices communiquent les erreurs de validation avant toute écriture, évitant la création de notes invalides.

## Points de vigilance
- Le nom d'image doit déjà suivre la convention `_WP.webp`; aucune conversion n'est réalisée ici.
- `lien_archives` et `lien_restes` générés doivent correspondre aux actions *Archives*/*Restes* (voir workflows associés).
- Toute modification du schéma YAML Journal (champs obligatoires) nécessite une mise à jour de cette documentation.

## Extensions possibles
- Ajout d'un champ optionnel pour renseigner `tags` ou `post_descr` dès la création.
- Pré-remplissage automatique du champ image depuis le presse-papiers ou un sélecteur de fichier.
- Support d'un mode « brouillon » désactivant `maj_wp` ou orientant vers un dossier différent.
