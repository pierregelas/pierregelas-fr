_Last updated: 2025-10-22 — Plugin v0.1.0_

> [!WARNING] Réorganisation partielle du plugin
> Depuis la création de l’action `importWordpress.ts`, l’architecture du plugin a été modifiée.  
> Les nouvelles actions suivent la structure **`src/actions/`**, tandis que les anciennes se trouvent encore dans **`src/commands/`**.  
> À terme, toutes les commandes historiques devront être **migrées dans `src/actions/`** et **reliées à la nouvelle logique de flux** (UI → Actions → Core → Services).  
> Cette transition provisoire explique la coexistence actuelle de deux approches :  
> - anciennes commandes encore fonctionnelles (`commands/`)  
> - nouvelles actions structurées (`actions/`).  
> ⚠️ Une phase de **migration et de refactor global** sera nécessaire pour homogénéiser les flux et les appels internes.


## 1️⃣ Vue par Dossier

### 📂 `src/`

Racine du code. Les sous-dossiers correspondent aux couches : **UI / Actions / Core / Services**.

### 📂 `src/actions/`

Actions “orchestratrices” déclenchées par l’utilisateur.

| Fichier              | Rôle                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `importWordpress.ts` | Boucle d’import CSV WordPress : lecture ligne à ligne, création/MAJ des notes, collecte **en mémoire** de `error_records` (sans relire les fichiers `ERROR_*`), renvoi d’un `ImportSummary` (compteurs, chemins, détails). Le champ `img_legende` est désormais sérialisé via `services/yamlBuilder.ts` avec un bloc YAML littéral (`\|`), assurant la compatibilité des légendes multiligne issues du CSV. |

**Responsabilités clés :**

- Appelle le parsing CSV (**Core/csv**).
    
- Construit le YAML master (**Core/yamlMaster** + mapping WP).
    
- Écrit/MAJ les notes (**Core/upsert**).
    
- Crée les fichiers d’erreur `ERROR_*` si besoin.
    
- Remplit **`summary.error_records`** (source unique du log d’erreurs).
    

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
|`yamlBuilder.ts`|Assemblage YAML depuis objets.|
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

### 📂 `src/commands/`

Commandes dédiées à d’autres workflows (journal, minutes, archives, restes, tags).

| Fichier                         | Rôle                    |
| ------------------------------- | ----------------------- |
| `archives.ts`                   | Actions archives.       |
| `journal.ts`/`journalRecalc.ts` | Recalcul journal.       |
| `minutes.ts`                    | Flux “Minutes”.         |
| `modifyNote.ts`                 | Modification de note.   |
| `restes.ts`                     | Flux “Restes du futur”. |

### Autres fichiers

- `src/settings.ts` : paramètres/plugin settings.
    
- `src/main.ts` : point d’entrée (registre commandes, charge settings).
    
- `styles.css` : styles UI.
    

### 🧰 Utilitaires communs

- `fileUtils.ts`, `dateUtils.ts`, `titleUtils.ts`, `validationUtils.ts`, `imageUtils.ts`, `journalUtils.ts`.
    

---
