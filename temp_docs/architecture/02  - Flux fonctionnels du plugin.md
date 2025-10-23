_Last updated: 2025-10-22 — Plugin v0.1.0_
### 🔄 Flux : Importation CSV WordPress (du clic au journal)

1. **UI** `ui/commands.ts`

- Commande palette “Importer un CSV WordPress”
- Pick du `.csv` → **dry-run** (prévisualisation), choix du dossier (par défaut `NEW/`).

2. **Action** `actions/importWordpress.ts`

- Lecture CSV → mapping → YAML → upsert notes.
- Création des `ERROR_*` si échec d’une ligne.
- **Remplit `summary.error_records` en mémoire** (source unique pour le log détaillé).
- Le champ `img_legende` (issu de `wp_img_caption`) est généré en bloc YAML littéral (`|`) via `yamlBuilder`, ce qui permet de conserver les retours à la ligne dans les légendes sans casser le frontmatter YAML.

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
    
