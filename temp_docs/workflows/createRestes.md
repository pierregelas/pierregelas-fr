# Workflows — Restes du futur depuis une note Journal

## Objectif
Présenter les actions `createRestesFromJournal()` et `updateRestesFromJournal()` (`src/actions/createRestes.ts`) qui automatisent la création puis la synchronisation d'une note *Restes du futur* à partir d'un Journal Photo.

## Résumé exécutif
### Création
1. **Validation de la note source** : confirmer que le fichier actif est un Journal Photo et que les champs (`post_titre_full`, `post_date`, `lien_restes`) sont présents.
2. **Extraction du wikilink cible** : lire `lien_restes`, en extraire le titre de note et vérifier son inexistence.
3. **Dérivation Restes** : calculer les titres (`deriveRestesTitlesFromLinkText`) et convertir le nom d'image WP en version REI (`toReiImageNameFromWp`).
4. **Préparation du YAML** : remplir les champs spécifiques Restes (liens croisés vers Journal & Archives, catégories, cover, etc.).
5. **Création Markdown** : générer le corps standard (photo + notes) et écrire la note via `createNoteFile()`.

### Mise à jour
1. **Identifier la note Restes** : rechercher d'abord par wikilink (`lien_restes`), sinon par `post_date` (`findRestesByPostDate`).
2. **Comparer les frontmatters** : analyser Journal & Restes (`normalizeMasterFields`) pour détecter date, tags et éventuel changement de titre/image/liens.
3. **Proposer une diff** : construire les `DiffItem[]` et afficher `openArchivesDiffModal()` (réutilisation) pour sélectionner les champs à appliquer et le renommage potentiel.
4. **Appliquer les changements** : relire la note Restes, patcher les champs (`applyMasterUpdate`), régénérer YAML + contenu, sauvegarder.
5. **Renommer si besoin** : appliquer le nouveau `post_titre_full` au fichier Markdown.
6. **Notifier** : message de succès, d'absence de changement ou d'erreur selon le cas.

## Pré-requis
- La note Journal source doit respecter le schéma YAML (champs `post_titre_full`, `post_date`, `lien_restes`, `img_filename`).
- Les services `archivesUtils`, `journalUtils`, `yamlMaster`, `archivesDiffModal`, `fileUtils` et `simpleInfoModal` sont fonctionnels.
- L'utilisateur peut créer/renommer des fichiers dans le vault.

## Entrées & sorties principales
| Élément | Description |
| --- | --- |
| Note Journal active | Source des données. |
| `createRestesFromJournal(app)` | Crée la note Restes si absente. |
| `updateRestesFromJournal(app)` | Met à jour une note existante via diff. |

## Déroulé détaillé — Création
1. **Lecture du frontmatter** : `getFrontmatter(app, file)` récupère les champs ; `isJournalPhotoCategory()` assure la catégorie.
2. **Normalisation** : `str()` nettoie `post_titre_full`, `post_date`, `lien_restes`, `lien_archives`, `img_filename`.
3. **Contrôles** : absence ou wikilink invalide → `Notice` d'erreur.
4. **Préparation des champs Restes** :
   - `deriveRestesTitlesFromLinkText(restesTitle)` → titres 1/2/full.
   - `toReiImageNameFromWp(imgFilenameWP)` → cover + `img_filename`.
   - `wrapWiki(postTitreFullJournal)` → `lien_journal`.
   - `lien_archives` repris tel quel (peut être null).
   - Les wikilinks scalaires (`lien_journal`, `lien_archives`, `lien_restes`) sont sérialisés via `emitScalar`, qui les entoure automatiquement de quotes simples pour éviter qu'Obsidian n'interprète le YAML comme des séquences imbriquées.
5. **Construction du master** : base `createEmptyMasterFields()`, catégories `photo` + `restes-du-futur`, liens projet `[[Photo]]`, `[[Restes du futur]]`, `maj_wp = true`, etc.
6. **Génération du corps** : template Markdown identique à Archives (Photo + Notes).
7. **Écriture** : `createNoteFile()` crée la note ; `Notice` succès ou erreur.

## Déroulé détaillé — Mise à jour
1. **Trouver la note Restes** :
   - Chercher via `unwrapWiki(lien_restes)` puis `vault.getAbstractFileByPath()`.
  - Sinon `findRestesByPostDate(app, post_date)`.
2. **Analyse des frontmatters** : `normalizeMasterFields()` pour Journal & Restes.
3. **Construction diff** :
   - Items communs (groupe A) : `post_date`, `tags`.
   - Items conditionnels (groupe B) recalculés si changement de titre : titres, image REI, cover, liens Journal/Archives.
   - Proposition de renommage = `post_titre_full` recalculé.
4. **Modale utilisateur** : `openArchivesDiffModal(app, model)` (recyclée) permet de cocher les champs.
5. **Application** :
   - Lecture `readMasterAndBody()` → master courant.
   - `applyMasterUpdate()` pour chaque clé sélectionnée (gère scalaires/listes/liens).
   - `buildYamlMaster(master, "restes")` + `assembleDocument()` → écriture via `vault.modify()`.
   - Renommage éventuel (`vault.rename()`).
6. **Notifications** :
   - Aucune sélection → notice "Aucun changement".
   - Succès → notice positive.
   - Erreurs → log + notice.

## Articulation avec la couche UI
- Commandes palette dédiées déclenchent ces workflows.
- `openInfoModal` informe si la note Restes est déjà parfaitement alignée avec le Journal.
- La modale diff réutilise le composant Archives pour maintenir une expérience uniforme.

## Points de vigilance
- `lien_restes` doit être un wikilink valide ; sinon aucune note cible n'est trouvée.
- La conversion d'image suppose un suffixe `_WP.webp` côté Journal.
- `findRestesByPostDate` effectue une recherche globale : prudence si plusieurs Restes partagent la même date.
- Les modifications manuelles du YAML Restes peuvent perturber la diff (comparaison textuelle simple).

## Extensions possibles
- Ajout d'un aperçu comparatif (image WP vs REI) dans la modale diff.
- Possibilité de recalculer automatiquement `tags` selon des règles ou templates.
- Gestion d'un dossier dédié pour les Restes créés automatiquement.
