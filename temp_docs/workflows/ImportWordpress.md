# Workflow — Import WordPress CSV

## Objectif
Décrire le déroulé complet de l’action `importWordpressCsv()` (`src/actions/importWordpress.ts`) qui transforme un export WordPress en notes Obsidian conformes au YAML maître du plugin.

## Résumé exécutif
1. **Validation du contexte** : vérifie le nommage du CSV (`parseCsvNameV2`) pour extraire `datasetKey` et `datasetId` (p.ex. `minutes-articles_20251018_PG.csv`).
2. **Lecture CSV contrôlée** : charge le fichier via `readCsv()` en forçant le séparateur `;` et en nettoyant l’éventuel BOM.
3. **Boucle ligne à ligne** : pour chaque `WpRow`, conversion en structure maître (`mapWpRowToMaster`), enrichissement (`maj_wp: false`, bloc `WP-IMPORT`) et génération du contenu complet (`emitYaml` + `renderBodyFromMaster`).
4. **Idempotence par `post_id`** : si une note existe (`findNoteByPostId`), compare le contenu courant (`diffChangedFields`) et applique les mises à jour nécessaires ; sinon crée un nouveau fichier via `ensureUniquePath`.
5. **Gestion des erreurs** : toute ligne invalide génère un ticket dans `ERRORS/` (hors dry-run) via `writeErrorNote()` et une entrée détaillée dans `error_records`.
6. **Journalisation & synthèse** : chaque action est tracée (`logLine`) et le résumé final (`ImportSummary`) consolide les compteurs ainsi que les listes `created_paths`, `updated_*_paths` et `error_paths`.

## Pré-requis
- **IO** : un adaptateur `VaultIO` opérationnel (lecture/écriture, existence de fichiers).
- **CSV** : export WordPress conforme au mapping attendu (`WpRow`). Les lignes doivent contenir au minimum `wp_id` numérique et `wp_titre`.
- **Dossier cible** : chemin absolu vers le répertoire d’import (`ImportOptions.outDirAbs`). Les notes d’erreur sont placées dans `ERRORS/` en sous-dossier.

## Entrées & sorties principales
| Élément | Description |
| --- | --- |
| `csvAbsPath` | Chemin absolu du CSV à importer. |
| `io` | Implémentation `VaultIO` (méthodes `read`, `write`, `exists`). |
| `opts.dryRun` | Si `true`, aucune écriture disque (`write`/`writeErrorNote`), mais le workflow calcule toutes les listes. |
| Retour | `ImportSummary` enrichi : compteurs `created/updated/errors`, sous-compteurs `updated_identical/updated_modified`, listes de chemins créés/mis à jour, détails des champs modifiés, `error_records`. |

## Déroulé détaillé
### 1. Initialisation
- Démarre un run (`startRun`) et crée `errorRecords[]`.
- Valide le nom du fichier (`parseCsvNameV2`). En cas d’échec → journalise l’erreur, termine (`finishRun`) et renvoie un résumé vide avec `errors = 1`.

### 2. Lecture & normalisation du CSV
- Utilise `readCsv(csvAbsPath, reader)` où `reader` injecte `io.read`.
- Nettoyage appliqué avant parsing :
  - Suppression du BOM éventuel.
  - Forçage/ajout de la directive `sep=;` (remplace `sep=,` si présent) pour garantir le bon séparateur.
- Résultat : tableau `WpRow[]` prêt pour le mapping.

### 3. Traitement d’une ligne (`for` sur `rows`)
1. **Validation bas niveau**
   - Lignes vides (`wp_id` + `wp_titre` vides) → `Error("ligne CSV vide …")`.
   - `wp_id` non numérique → `Error("post_id invalide …")`.
2. **Mapping & enrichissement**
   - `mapWpRowToMaster(row)` → structure maître.
   - `enforceTitleAndIdForImport()` remplit `post_titre_full`, `post_id` et garantit leur présence.
   - Force `maj_wp = false` (source WordPress).
   - Insère le bloc `WP-IMPORT` (`setWpImportBlock(master, { datasetKey, datasetId })`).
   - Prépare le contenu final via `buildNoteContent(master)` (`emitYaml` + `renderBodyFromMaster`).
3. **Résolution du fichier cible**
   - Recherche d’une note existante par `post_id` via `findNoteByPostId()`.
   - Si trouvée :
     - Compare ancien/nouveau contenu (`diffChangedFields`).
     - Si identique → incrémente `updated_identical`, ajoute le chemin dans `updated_identical_paths` et n’écrit rien.
     - Sinon → écrit le nouveau contenu (sauf `dryRun`), remplit `updated_modified`, `updated_modified_paths` et `updated_modified_details[{ path, fields }]`.
   - Si inexistante :
     - Génère un nom fichier depuis `post_titre_full` (`sanitizeForFilename`).
     - Assure l’unicité via `ensureUniquePath(outDir, baseName, io.exists)`.
     - Écrit la note (sauf `dryRun`) et ajoute le chemin à `created_paths`.
4. **Journalisation**
   - Chaque ligne validée envoie `logLine(run, { index, status: "created"|"updated", path, post_id, identical? })`.

### 4. Gestion des erreurs par ligne
- Bloc `catch` local autour du traitement ligne :
  - Message d’erreur formaté (`String(err.message ?? err)`).
  - Création d’une note détaillée via `writeErrorNote()` (si pas `dryRun`).
    - YAML de diagnostic : `maj_wp: false`, `wp_error`, index, valeurs brutes, headers, etc.
  - Remplissage de `errorRecords` avec :
    - `wp_error`, `post_id`, `wp_row_index`, `wp_id_raw`, `wp_titre_raw`, `error_type` (déduit par `inferErrorType`), `errorFileWikilink`.
  - Incrément de `errors` + `error_paths`.
  - Journalisation `status: "error"`.

### 5. Finalisation
- `finishRun(run)` fournit la durée et autres métadonnées.
- Retourne l’objet résumé en y ajoutant les accumulateurs (`created`, `updated`, `updated_identical`, etc.) et `error_records`.
- Catch global : en cas d’exception hors boucle, log, `finishRun`, renvoie un résumé neutre avec `errors = 1`.

## Cas spécifiques & bonnes pratiques
- **Dry-run** : permet de mesurer l’impact de l’import sans toucher au disque ; seules les écritures (`write`, `writeErrorNote`) sont bloquées mais les chemins uniques sont quand même calculés.
- **Notes existantes identiques** : aucun `write`, mais elles sont comptabilisées dans `updated_identical` pour informer que le `post_id` est déjà synchronisé.
- **Bloc WP-IMPORT** : requis pour tracer l’origine de la note ; assuré par `setWpImportBlock` avant sérialisation, et donc présent dans les diff.
- **Fichiers d’erreurs** : situés sous `<outDir>/ERRORS/`. Le nom inclut `ERROR_<post_id>_<titre>.md` (normalisé). Utile pour corriger manuellement puis relancer l’import.
- **Diff YAML** : `diffChangedFields` effectue un parsing clé/val minimal des fronts YAML (`extractYamlKV`) et compare aussi le corps normalisé (LF). Permet d’afficher dans le journal quelles clés ont changé.

## Articulation avec la couche UI
- `ui/commands.ts` appelle `importWordpressCsv()` pour les actions utilisateur (dry-run et import réel).
- Le résultat (`ImportSummary` enrichi) est ensuite transmis à `writeImportLog()` pour générer le journal Markdown post-import.
- Les `error_records` sont la source unique pour construire la section “Erreurs” du journal, sans relire les fichiers `ERROR_*`.

## Points de vigilance
- Vérifier que la modale de sélection CSV filtre déjà les fichiers mal nommés : le workflow échoue sinon dès le début.
- `findNoteByPostId` doit couvrir l’ensemble du vault pour éviter les duplications.
- Les collisions de noms sont gérées par `ensureUniquePath`, mais un `post_titre_full` vide provoquerait une erreur en amont (`enforceTitleAndIdForImport`).
- Penser à ajuster `setWpImportBlock` si le schéma YAML évolue (clé/nom du bloc).

## Extensions possibles
- Ajouter un mode “report-only” exportable (basé sur `updated_modified_details`).
- Support des fichiers WordPress multi-lingues si le mapping `WpRow` évolue.
- Paramétrer le dossier `ERRORS` (aujourd’hui imposé à `<outDir>/ERRORS`).
