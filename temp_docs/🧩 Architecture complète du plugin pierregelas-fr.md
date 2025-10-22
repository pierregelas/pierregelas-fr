# 🧩 Architecture complète du plugin `pierregelas-fr` — Carte détaillée



> [!WARNING] Réorganisation partielle du plugin
> Depuis la création de l’action `importWordpress.ts`, l’architecture du plugin a été modifiée.  
> Les nouvelles actions suivent la structure **`src/actions/`**, tandis que les anciennes se trouvent encore dans **`src/commands/`**.  
> À terme, toutes les commandes historiques devront être **migrées dans `src/actions/`** et **reliées à la nouvelle logique de flux** (UI → Actions → Core → Services).  
> Cette transition provisoire explique la coexistence actuelle de deux approches :  
> - anciennes commandes encore fonctionnelles (`commands/`)  
> - nouvelles actions structurées (`actions/`).  
> ⚠️ Une phase de **migration et de refactor global** sera nécessaire pour homogénéiser les flux et les appels internes.



> Double vue : **par dossier** et **par flux**.  
> Spécificités validées par lecture du code (Import CSV WP, log détaillé des erreurs en mémoire, séparation UI/Actions/Core/Services).

## 1️⃣ Vue par Dossier

### 📂 `src/`

Racine du code. Les sous-dossiers correspondent aux couches : **UI / Actions / Core / Services**.

### 📂 `src/actions/`

Actions “orchestratrices” déclenchées par l’utilisateur.

| Fichier              | Rôle                                                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `importWordpress.ts` | Boucle d’import CSV WordPress : lecture ligne à ligne, création/MAJ des notes, collecte **en mémoire** de `error_records` (sans relire les fichiers `ERROR_*`), renvoi d’un `ImportSummary` (compteurs, chemins, détails). |

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
    

---

## 2️⃣ Vue par Flux Fonctionnel

### 🔄 Flux : Importation CSV WordPress (du clic au journal)

1. **UI** `ui/commands.ts`
    

- Commande palette “Importer un CSV WordPress”
    
- Pick du `.csv` → **dry-run** (prévisualisation), choix du dossier (par défaut `NEW/`).
    

2. **Action** `actions/importWordpress.ts`
    

- Lecture CSV → mapping → YAML → upsert notes.
    
- Création des `ERROR_*` si échec d’une ligne.
    
- **Remplit `summary.error_records` en mémoire** (source unique pour le log détaillé).
    

3. **Journal d’import (Markdown)** `ui/commands.ts`
    

- Écrit **`NEW/LOGS/import-YYYYMMDD-HHMMSS.md`**.
    
- Sections : Résumé / Créés / Modifiées (champs modifiés) / Identiques / **Erreurs détaillées**.
    
- **`## Erreurs`** : pour chaque erreur, affiche le wikilink `[[ERROR_*]]` + sous-lignes :
    
    - `wp_error:`
        
    - `post-id:`
        
    - `wp_row_index:`
        
    - `wp_id_raw:`
        
    - `wp_titre_raw:`
        
    - `error_type:`  
        _(Sans ligne vide entre items.)_
        

### 🗂️ Flux : Archives (`src/commands/archives.ts`)

- Action destinée à **gérer les fichiers d’archives** issus de WordPress ou du vault.
    
- Analyse les notes d’archives existantes, compare les métadonnées (`post_date`, `wp_categories`, etc.) et crée ou met à jour les entrées manquantes.
    
- Peut s’appuyer sur `core/archivesUtils.ts` pour le tri et la validation.
    
- Produit des logs spécifiques (résumés des fichiers ajoutés/ignorés) via `services/actionLogger.ts`.
    
- À migrer vers `src/actions/archives.ts` avec intégration au schéma ImportSummary pour homogénéiser les retours et journaux.

### 🕓 Flux : Journal et JournalRecalc (`src/commands/journal.ts`, `src/commands/journalRecalc.ts`)

- Commandes destinées au **recalcul des journaux chronologiques**.
    
- Utilisent `core/journalUtils.ts` pour recalculer les liens temporels, les index et les références croisées (“avant/après”).
    
- `journal.ts` pilote la création ou mise à jour des pages de journal, tandis que `journalRecalc.ts` effectue un recalcul ciblé sur les dates ou catégories.
    
- Logs simplifiés produits via `actionLogger.ts` (pas de `NEW/LOGS`).
    
- À terme, ces actions devront adopter le modèle `ImportSummary` et l’écriture Markdown unifiée (même format de log détaillé).

### 🎞️ Flux : Minutes (`src/commands/minutes.ts`)

- Commande dédiée au **projet “Minutes”**, orientée vidéo et carnet visuel.
    
- Génère des notes liées à des vidéos ou séquences audiovisuelles, en s’appuyant sur le même système YAML (`post_titre_full`, `post_date`, `tags`, `lien_projet`).
    
- Les connexions entre vidéos (“ailleurs”, “avant/après”) sont calculées à partir des métadonnées.
    
- Le flux n’utilise pas encore la couche `core/yamlMaster.ts` ni le `ImportSummary`, mais suit une logique similaire (création de notes + liens).
    
- Migration future : harmonisation avec le modèle `actions/importWordpress.ts` pour bénéficier du logging unifié.

### 📝 Flux : ModifyNote (`src/commands/modifyNote.ts`)

- Action permettant de **modifier une note existante** après import.
    
- Ajoute ou met à jour des métadonnées (ex. ajout de tags, mise à jour du frontmatter YAML).
    
- Utilise directement les utilitaires `core/yamlPatch.ts` et `services/yamlBuilder.ts`.
    
- Génère des logs succincts via `actionLogger.ts`.
    
- À migrer vers une action normalisée dans `src/actions/` avec support du `ImportSummary` (pour suivi complet des modifications et erreurs).

### 🌌 Flux : Restes du futur (`src/commands/restes.ts`)

- Commande propre au **projet “Restes du futur”**, destinée à créer et relier des notes thématiques.
    
- Suit une logique proche de `minutes.ts`, mais orientée texte et exploration documentaire.
    
- Produit des notes interconnectées avec des champs `lien_projet` et `wp_categories`.
    
- Utilise ponctuellement `core/yamlMaster.ts` pour sérialiser les métadonnées.
    
- Ne génère pas encore de journal Markdown complet : les logs passent par `actionLogger.ts`.
    
- À migrer vers `src/actions/restes.ts` pour uniformiser le flux (YAML, log, gestion des erreurs).

### 🧾 Flux : Logging global (autres modules)

- **Service** `services/actionLogger.ts`  
    → Journaux génériques (ex. Tags) **dans `wp_tags/logs_tests/`**.
    
- **Important** : ce service **n’écrit pas** le journal d’**import CSV WP** (géré par `ui/commands.ts` dans `NEW/LOGS/`).
    

### 🧩 Flux : YAML / transformations

- **Core** : `mapping.wordpress.ts` → `yamlMaster.ts` → `bodyRenderer.ts`.
    
- Normalisations via `transform.ts`; garde via `importGuard.ts`.
    
- Upsert stable via `upsert.ts`.
    

### 🪶 Flux : UI / Modales

- `previewModal.ts` (dry-run et choix de dossier).
    
- Modales complémentaires (tags, archives, journal).
    

### 🧰 Utilitaires communs

- `fileUtils.ts`, `dateUtils.ts`, `titleUtils.ts`, `validationUtils.ts`, `imageUtils.ts`, `journalUtils.ts`.
    

---

## 3️⃣ Spécificités validées / points d’attention

- **Source unique d’erreur (`wp_error`)** : stockée **en mémoire** pendant l’import; **pas** de parsing des fichiers `ERROR_*` pour alimenter le journal.
    
- **Bloc `## Erreurs`** : rendu **par `ui/commands.ts`** depuis `summary.error_records` (ordre fixe des sous-lignes, valeurs manquantes `""`, pas de ligne vide entre items).
    
- **Séparation des journaux** :
    
    - Import CSV WP → `NEW/LOGS/…` **(UI/commands.ts)**.
        
    - Tags & co. → `wp_tags/logs_tests/` **(services/actionLogger.ts)**.
        
- **Flux validé** : UI → Action → Core → Journal d’import (UI).
    

---

## 4️⃣ Annexes (contrats de types essentiels)

- `ImportErrorRecord` :
    
    - `wp_error: string`
        
    - `post_id: string`
        
    - `wp_row_index: number`
        
    - `wp_id_raw: string`
        
    - `wp_titre_raw: string`
        
    - `error_type: string`
        
    - `errorFileWikilink: string`
        
- `ImportSummary` (extrait) :
    
    - `created`, `updated`, `errors`: `number`
        
    - `created_paths?`, `updated_identical_paths?`, `updated_modified_paths?`, `error_paths?`: `string[]`
        
    - `updated_modified_details?`: `{ path: string; fields: string[] }[]`
        
    - `error_records?`: `ImportErrorRecord[]`
        

---

## 5️⃣ Mini check QA (à chaque refactor)

- La commande “Importer un CSV WordPress” produit bien un fichier **`NEW/LOGS/import-*.md`**.
    
- La section **`## Erreurs`** du journal contient les **sous-lignes** listées (ordre fixe, pas de ligne vide).
    
- `ImportSummary.error_records` est **renseigné côté action** et **consommé côté UI**.
    
- Les journaux de **Tags** continuent d’aller dans **`wp_tags/logs_tests/`** (pas de régression de cible).