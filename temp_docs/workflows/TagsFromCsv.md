# Workflow — Mise à jour des tags depuis le dernier CSV
_Last updated: 2025-10-25 — Plugin v0.7.0_

## Objectif
Décrire l'action `registerTagsCommand()` (`src/actions/tags.ts`) qui implémente la commande palette « Tags → Mettre à jour depuis le dernier CSV (WP → Obsidian) » : comparaison entre le dernier export WordPress et la table locale `ob_tags_table.md`, avec diff interactive, backup et journalisation optionnelle.

## Résumé exécutif
1. **Recherche du CSV** : localiser le fichier le plus récent correspondant à `TAGS_CSV_PATTERN` dans `TAGS_CSV_DIR`.
2. **Lecture & validation** : parser le CSV (`readAndParseCsv`) avec contrôle d’en-tête ; stocker les lignes et le contenu brut.
3. **Lecture de la table locale** : charger `wp_tags/ob_tags_table.md` (`readTagsTable`) pour obtenir les lignes existantes et la plage Markdown.
4. **Initialisation du journal** : si le logging est activé (`isLoggingEnabled`), ouvrir un fichier de log (`beginActionLog`) et y verser les entrées (CSV brut, table locale).
5. **Construction de la diff** : `buildTagsDiff()` calcule les éléments actionnables ou informatifs et les compteurs.
6. **Affichage utilisateur** : ouvrir `openTagsDiffModal()` (toujours) afin de présenter les changements et recueillir la sélection éventuelle.
7. **Cas « aucun changement »** : si aucun item actionnable, simplement mettre à jour le YAML (timestamps, `wp_update`) + backup + log.
8. **Cas « sélection appliquée »** : appliquer les items choisis (`applyTagsDiff`), régénérer la table (`renderTagsTable`), mettre à jour le YAML, sauvegarder et finaliser le log.
9. **Gestion des erreurs et annulations** : notices, modales d’info et log final selon le statut (succès, annulation, erreur).

## Pré-requis
- Export CSV présent dans `wp_tags/csv/` (par défaut) et respectant l’en-tête `wp_tags_id,wp_tags_name,wp_tags_slug,wp_tags_count`.
- Fichier `wp_tags/ob_tags_table.md` existant (5 colonnes). En cas d’absence, l’action s’arrête avec un message d’aide.
- Paramètre « logging » activé/désactivé via les settings du plugin.
- Droits d’écriture dans le vault (modification de la table, backup, création éventuelle de log).

## Entrées & sorties principales
| Élément | Description |
| --- | --- |
| `plugin` | Fournit `app`, `vault`, `addCommand` et l’accès aux settings. |
| CSV source | Fichier `TagRow` le plus récent. |
| Table locale | `LocalTagRow[]` + metadata (`readTagsTable`). |
| Log Markdown | Optionnel (`beginActionLog`/`finalizeActionLog`). |
| Retour | Aucun (effets : modifications de fichiers, notices, logs). |

## Déroulé détaillé
### 1. Localisation du CSV
- `findLatestCsv(app.vault)` parcourt `TAGS_CSV_DIR` (constante) et renvoie le fichier respectant `TAGS_CSV_PATTERN` avec la date la plus récente.
- Absence → `Notice` explicite et fin du workflow.

### 2. Lecture du CSV
- `readAndParseCsv(app.vault, csvFile)` retourne `rows`, `headerValid`, `errors`.
- Si l’en-tête ne correspond pas : `openInfoModal()` détaille l’erreur et stoppe la commande.
- En cas d’avertissements (lignes ignorées), afficher une `Notice` (mais continuer).
- Conserver `csvRaw = vault.read(csvFile)` pour le log éventuel.

### 3. Lecture de la table locale
- `readTagsTable(app.vault)` retourne :
  - `file`: le `TFile` Markdown.
  - `raw`: contenu complet.
  - `table`: métadonnées (start/end line, lignes par colonne) ou `null`.
- Absence → `openInfoModal()` guidant la création du fichier.

### 4. Journalisation optionnelle
- Si `isLoggingEnabled(plugin)` :
  - `beginActionLog()` crée un Markdown dans `wp_tags/logs_tests/` (via `LOGS_DIR`) et renvoie `logPath`, `startedAt`.
  - Ajouter sections : « Entrées — CSV (lu) » (`csvRaw`), « Entrées — Table locale (brute) » (`extractTableSlice`).

### 5. Construction de la diff
- `buildTagsDiff(csvRows, localRows)` produit :
  - `items: DiffItem[]` (groupés par `DiffKind`).
  - `counts: Record<DiffKind, number>`.
  - `hasActionable`: booléen.
- Si logging actif : stocker une version Markdown (via `buildDiffMarkdown`) dans le log.

### 6. Modale diff
- `openTagsDiffModal(app, { items, dialogTitle, csvName })` :
  - Toujours affichée, même si aucun changement (titre adapté).
  - Peut lever une exception (problème UI) → catcher, journaliser et afficher une modale d’information fallback.
- `result?.applyKeys` contient les clés sélectionnées.

### 7. Cas sans item actionnable
- Si `diff.hasActionable === false` :
  - Mettre à jour uniquement le YAML de `ob_tags_table.md` :
    - `tags_last_udpdate` (timestamp local `YYYY-MM-DD hh:mm`).
    - `tags_last_csv` (wikilink vers le CSV).
    - `wp_update` (bool `hasLocalWithoutIdMissingInCsv`).
  - `backupTagsTable()` crée une copie avant écriture.
  - `applyYamlPatch()` injecte les nouvelles valeurs.
  - `vault.modify()` sauvegarde le fichier.
  - Logging : `finalizeActionLog(..., status: "success")` avec compteurs.
  - `openInfoModal` non utilisé sauf erreur ; `Notice` optionnelle.

### 8. Cas avec sélection
- Si l'utilisateur annule (`result == null`) ou ne coche rien → finaliser log (`status: "cancel"`) et arrêter.
- Sinon :
  1. `applyTagsDiff(localRows, applyItems)` renvoie `newRows` triés par slug.
  2. `renderTagsTable(newRows)` génère le Markdown (table 5 colonnes).
  3. Calculer `yamlUpdates` comme ci-dessus (`tags_last_udpdate`, `tags_last_csv`, `wp_update`).
  4. `backupTagsTable()` avant écriture.
  5. `applyYamlPatch(tagsDoc.raw, yamlUpdates)` met à jour le YAML.
  6. `replaceTableInContent()` remplace la table dans le corps Markdown.
  7. `vault.modify()` sauvegarde le nouveau contenu.
  8. Logging : `finalizeActionLog(..., status: "success", appliedCounts, finalTableMd, yamlSummary, backupPath…)`.
  9. `Notice` finale confirmant la mise à jour.

### 9. Gestion des erreurs
- Toute exception pendant lecture, diff, backup ou écriture :
  - Log `console.error`.
  - `openInfoModal()` ou `Notice` selon le contexte.
  - `finalizeActionLog(..., status: "error", errorMessage)` si logging actif.

## Articulation avec la couche UI
- Commande palette unique accessible via la catégorie « Tags ».
- Modale diff (vue riche) pour guider l’utilisateur dans l’application des changements.
- Modales d’information (`openInfoModal`) pour signaler les situations bloquantes (CSV invalide, fichier manquant, erreur).
- Notices succinctes pour feedback rapide (CSV trouvé, avertissements, succès final).

## Points de vigilance
- Le CSV doit être proprement formatté (`;` ou `,` géré en amont par `readAndParseCsv`), sinon la diff sera vide ou incorrecte.
- `hasLocalWithoutIdMissingInCsv` influence le booléen `wp_update` : vérifier la cohérence fonctionnelle de ce champ.
- Les backups peuvent s'accumuler : prévoir un nettoyage périodique.
- Le log peut contenir des données sensibles (liste complète des tags) ; attention à la volumétrie.
- Les marqueurs `obm` (modifié localement) et `obc` (créé localement) restent la référence pour savoir si un slug/name peut être
  écrasé ; la diff protège automatiquement ces cas.

## Extensions possibles
- Support du choix manuel du CSV si plusieurs exports coexistent.
- Ajout d'un mode « simulation » écrivant seulement le log/diff sans modifier la table.
- Intégration d'un aperçu HTML ou graphique de la diff dans la modale ou le log.
