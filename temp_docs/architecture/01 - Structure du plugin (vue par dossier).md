_Last updated: 2025-10-23 — Plugin v0.1.0_



## 1️⃣ Vue par Dossier

### 📂 `src/`

Racine du code. Les sous-dossiers correspondent aux couches : **UI / Actions / Core / Services**.

### 📂 `src/actions/`

Actions “orchestratrices” déclenchées par l’utilisateur.

| Fichier | Rôle |
| --- | --- |
| `createMinutes.ts` | Flux Minutes : saisie UI, dérivations (titres/date/image), construction `MasterFields`, écriture YAML via `buildYamlMaster`. |
| `createJournal.ts` | Création d’une note Journal (modale dédiée) → MasterFields + corps type « Photo / Notes ». |
| `createArchives.ts` | Processus Archives du futur : création (P1) et mise à jour (P2) avec diff modale, sérialisation YAML maître et renommage éventuel. |
| `createRestes.ts` | Processus Restes du futur : même logique que Archives (P1/P2) avec YAML maître unifié. |
| `journalRecalc.ts` | Commande de recalcul des titres Journal depuis `post_titre_1` (patch ciblé). |
| `modifyNote.ts` | Modification rapide des notes (garde le frontmatter existant). |
| `tags.ts` | Synchronisation et diff des tags (commandes dédiées). |
| `importWordpress.ts` | Boucle d’import CSV WordPress : lecture ligne à ligne, création/MAJ des notes, collecte **en mémoire** de `error_records` (sans relire les fichiers `ERROR_*`), renvoi d’un `ImportSummary` (compteurs, chemins, détails). `img_legende` est sérialisé via `services/yamlBuilder.ts` pour gérer les blocs multiligne. |

### 📂 `src/core/`

Cœur métier : types, parsing/transformations, YAML, I/O de notes.

|Fichier|Rôle|
|---|---|
|`types.ts`|Contrats de données : `WpRow`, `MasterFields`, `ImportErrorRecord`, `ImportSummary` (incluant `error_records?: ImportErrorRecord[]`).|
|`csv.ts`|Lecture/parse CSV.|
|`csvMeta.ts`|Métadonnées dataset CSV.|
|`mapping.wordpress.ts`|Transformation WP → master YAML.|
|`yamlMaster.ts`|Construction/sérialisation YAML frontmatter.|
|`files.ts`|Helpers fichiers bas niveau.|
|`upsert.ts`|Lecture/écriture de notes (création/MAJ idempotentes).|
|`log.ts`|Traces d’exécution (progression).|
|`bodyRenderer.ts`|Génération du corps Markdown.|
|`transform.ts`|Normalisations/slugifications.|
|`importGuard.ts`|Garde d’import (présence colonnes, cohérence).|

### 📂 `src/services/`

Services transverses réutilisables.

|Fichier|Rôle|
|---|---|
|`actionLogger.ts`|**Service générique** de journaux pour d’autres modules (ex. Tags). Écrit **dans `wp_tags/logs_tests/`**. **Ne** produit **pas** le journal d’import CSV WP.|
|`yamlPatch.ts`|Patch frontmatter.|
|`yamlBuilder.ts`|Utilitaire bas niveau (`pushYamlBlock`) pour émettre les blocs YAML multiligne.|
|`fileUtils.ts`|Chemins, création dossiers, compatibilité OS.|
|`dateUtils.ts`|Dates/formatage.|
|`titleUtils.ts`|Cohérence titres.|
|`validationUtils.ts`|Validations de structures.|
|`archivesUtils.ts`|Utilitaires archives.|
|`imageUtils.ts`|Images associées aux notes.|
|`journalUtils.ts`|Recalcul de journaux.|
|`tagsCsv.ts`, `tagsDiff.ts`, `tagsTable.ts`|Synchronisation/écarts de tags.|

### 📂 `src/ui/`

Interface utilisateur (commandes/modales) et **journal d’import CSV WP**.

|Fichier|Rôle|
|---|---|
|`commands.ts`|Commande **“Importer un CSV WordPress”** : sélection CSV, **dry-run**, choix du dossier, import réel, et **écriture du journal d’import** **dans `NEW/LOGS/`** (incluant `## Erreurs` détaillé depuis `summary.error_records`).|
|`previewModal.ts`|Modale de prévisualisation (totaux, identiques/modifiées, erreurs).|

### 📂 `src/modals/`

Modales thématiques (archives, tags, journal).

|Fichier|Rôle|
|---|---|
|`archivesDiffModal.ts`|Diff d’archives.|
|`simpleInfoModal.ts`|Infos génériques.|
|`tagsDiffModal.ts`|Diff de tags.|
|`tagsSelectModal.ts`|Sélecteur de tags.|

### Autres fichiers

- `src/settings.ts` : paramètres/plugin settings.
    
- `src/main.ts` : point d’entrée (registre commandes, charge settings).
    
- `styles.css` : styles UI.
    

### 🧰 Utilitaires communs

- `fileUtils.ts`, `dateUtils.ts`, `titleUtils.ts`, `validationUtils.ts`, `imageUtils.ts`, `journalUtils.ts`.
    

---
