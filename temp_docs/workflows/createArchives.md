# Workflows — Archives du futur depuis une note Journal
_Last updated: 2025-10-24 — Plugin v0.6.0_

## Objectif
Documenter les actions `createArchivesFromJournal()` et `updateArchivesFromJournal()` (`src/actions/createArchives.ts`) qui pilotent respectivement la création et la synchronisation d'une note *Archives du futur* à partir d'une note *Journal Photo* existante.

## Résumé exécutif
### Création
1. **Préconditions Journal** : vérifier que la note active est un Journal Photo avec les champs clés (`post_titre_full`, `post_date`, `lien_archives`).
2. **Vérification du lien cible** : extraire le wikilink `lien_archives`, nettoyer `[[...]]` puis déterminer le nom de la note Archives à créer et s'assurer qu'elle n'existe pas.
3. **Dérivation des métadonnées** : calculer les titres Archives (`deriveArchivesTitlesFromLinkText`) depuis le texte du lien (avec repli sur ce texte si la portion avant « Archives » est absente), convertir l'image WP en version « BF » (`toBfImageNameFromWp`) et préparer la légende d'image.
4. **Construction YAML + corps** : initialiser le master, renseigner les champs spécifiques Archives et générer le Markdown standard.
5. **Création de fichier** : appeler `createNoteFile()` pour écrire `Archives.md`, puis notifier l'utilisateur.

### Mise à jour
1. **Localiser Journal + Archives** : vérifier la note active (Journal Photo) et retrouver la note Archives liée (via `lien_archives` ou `post_date`).
2. **Comparer les métadonnées** : charger les frontmatters (`normalizeMasterFields`) et construire une liste de deltas (`DiffItem[]`) sur la date, les tags et — si besoin — les titres, images et liens croisés.
3. **Interaction utilisateur** : afficher `openArchivesDiffModal()` pour que l'utilisateur choisisse les champs à appliquer et, le cas échéant, saisir une proposition de renommage.
4. **Application sélective** : relire la note Archives, appliquer les champs sélectionnés (`applyMasterUpdate`), régénérer le YAML (`buildYamlMaster`) et réécrire le fichier.
5. **Renommage optionnel** : si l'utilisateur valide un nouveau titre complet, renommer le fichier Markdown.
6. **Notice finale** : succès ou message d'erreur selon le résultat de l'opération.

## Pré-requis
- Le frontmatter Journal doit contenir `post_titre_full`, `post_date`, `lien_archives`, `img_filename`.
- Les services `archivesUtils`, `journalUtils`, `yamlMaster`, `archivesDiffModal`, `fileUtils` et `simpleInfoModal` doivent être opérationnels.
- L'utilisateur dispose de droits d'écriture/renommage dans le vault.

## Entrées & sorties principales
| Élément | Description |
| --- | --- |
| Note Journal active | Source des métadonnées (frontmatter). |
| `createArchivesFromJournal(app)` | Crée `[[lien_archives]].md` si absent. Retour `Promise<void>`. |
| `updateArchivesFromJournal(app)` | Synchronise une note existante via modale Diff. Retour `Promise<void>`. |

## Déroulé détaillé — Création
1. **Récupération du contexte** : `getFrontmatter(app, file)` lit le frontmatter de la note active ; `isJournalPhotoCategory()` valide la catégorie (`photo` + `journal-photo`).
2. **Extraction des champs** : `str()` normalise `post_titre_full`, `post_date`, `lien_archives`, `lien_restes`, `img_filename`.
3. **Contrôles** : absence de champs → `Notice` avec arrêt. `unwrapWiki(lien_archives)` doit retourner un libellé.
4. **Préparation des données Archives** :
   - Dériver titres (`post_titre_1`, `post_titre_2`, `post_titre_full`).
   - Convertir l'image WP (`toBfImageNameFromWp`).
   - Générer `lien_journal = [[post_titre_full_journal]]` et reprendre `lien_restes` (si présent).
   - Les wikilinks scalaires (`lien_journal`, `lien_archives`, `lien_restes`) sont protégés par `emitScalar`, qui les quote automatiquement pour éviter les séquences YAML imbriquées dans Obsidian.
5. **YAML & corps** : `createEmptyMasterFields()` → remplissage des champs Archives (catégories `photo`, `archives-du-futur`, liens projet, etc.) → `buildYamlMaster(master, "archives")`.
6. **Contenu Markdown** : template commun (section Photo + Notes).
7. **Écriture** : `createNoteFile()` crée la note et affiche `Notice` de succès ; erreurs loguées + `Notice` d'échec.

## Déroulé détaillé — Mise à jour
1. **Localisation de la note Archives** :
   - `unwrapWiki(lien_archives)` → tentative directe `vault.getAbstractFileByPath("<titre>.md")`.
   - À défaut, `findArchivesByPostDate(app, post_date)` parcourt toutes les notes `archives-du-futur` pour trouver la même date.
2. **Lecture des frontmatters** : `getFrontmatter()` + `normalizeMasterFields()` sur Journal et Archives.
3. **Préparation de la diff** :
   - Groupe `A` (champ direct) : `post_date`, `tags`.
   - Groupe `B` (si le titre doit changer) : recalcul complet des titres, images, liens croisés, cover.
   - `suggestedRename` reçoit le `post_titre_full` recalculé.
4. **Modale de confirmation** : `openArchivesDiffModal(app, model)` présente les items ; l'utilisateur coche/décoche et valide.
5. **Application** :
   - Lecture complète du fichier Archives (`readMasterAndBody`) → reconstruction du master courant.
   - Pour chaque clé choisie : `applyMasterUpdate()` applique la valeur (gestion des scalaires vs listes vs liens).
   - Réécriture via `buildYamlMaster()` + `assembleDocument()` puis `vault.modify()`.
   - Renommage du fichier si `result.renameTo` renseigné.
6. **Notifications** :
   - Aucun changement sélectionné → `Notice` dédiée.
   - Succès → `Notice` « mise à jour ».
   - Exceptions → log console + `Notice` d'erreur.

## Articulation avec la couche UI
- Les commandes palette « Créer Archives du futur » et « Synchroniser Archives du futur » appellent respectivement les deux actions.
- `openArchivesDiffModal` fournit une interface riche (cases à cocher, prévisualisation) pour éviter l'écriture automatique.
- `openInfoModal` offre un feedback en cas de note déjà conforme.

## Points de vigilance
- `lien_archives` doit toujours être un wikilink : sinon `unwrapWiki` échoue et l'action est bloquée.
- Les conversions d'image supposent la convention `_WP.webp` → `_BF.webp`; toute variation nécessite d'adapter `toBfImageNameFromWp`.
- La recherche par `post_date` peut renvoyer une note inattendue si plusieurs Archives partagent la même date.
- Les modifications directes du YAML Archives en dehors de ces commandes peuvent introduire des désynchronisations ; la diff repose sur une comparaison textuelle simple.

## Extensions possibles
- Gérer la création automatique du sous-dossier cible si absent.
- Ajouter un aperçu dans la modale Diff (avant/après) pour les champs image et liens.
- Autoriser le recalcul de `tags` à partir d'un template ou d'une note source.
