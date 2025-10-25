_Last updated: 2025-10-24 — Plugin v0.7.0_
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
        

### 🗂️ Flux : Archives (`src/actions/createArchives.ts`)

- Action destinée à **gérer les fichiers d’archives** issus de WordPress ou du vault.
    
- Analyse les notes d’archives existantes, compare les métadonnées (`post_date`, `wp_categories`, etc.) et crée ou met à jour les entrées manquantes.
    
- S’appuie sur `services/archivesUtils.ts` pour les dérivations de titres et la transformation des noms d’images.
    
- Diff modale (P2) → YAML maître réécrit via `buildYamlMaster` (préserve les sections).

### 🕓 Flux : Journal et JournalRecalc (`src/actions/createJournal.ts`, `src/actions/journalRecalc.ts`)

- Commandes destinées au **recalcul des journaux chronologiques**.
    
- Utilisent `services/journalUtils.ts` et `services/dateUtils.ts` pour recalculer les liens temporels, les index et les références croisées (“avant/après”).
    
- `createJournal.ts` pilote la création/mise à jour des pages de journal, tandis que `journalRecalc.ts` effectue un recalcul ciblé sur les dates ou catégories.
    
- Retour utilisateur via notices et modales (aucune écriture de log dédiée en dehors de la note Journal elle-même).
    
- YAML maître généré via `buildYamlMaster`; journaux dédiés toujours gérés via notices modales (pas de NEW/LOGS).

### 🎞️ Flux : Minutes (`src/actions/createMinutes.ts`)

- Commande dédiée au **projet “Minutes”**, orientée vidéo et carnet visuel.
    
- Génère des notes liées à des vidéos ou séquences audiovisuelles, en s’appuyant sur le même système YAML (`post_titre_full`, `post_date`, `tags`, `lien_projet`).
    
- Les connexions entre vidéos (“ailleurs”, “avant/après”) sont calculées à partir des métadonnées.
    
- Utilise `buildYamlMaster` + `MasterFields` pour la création (YAML homogénéisé).
    
- Journaux : notices succinctes (pas de journal Markdown dédié).

### 📝 Flux : ModifyNote (`src/actions/modifyNote.ts`)

- Action permettant de **modifier une note existante** après import.
    
- Ajoute ou met à jour des métadonnées (ex. ajout de tags, mise à jour du frontmatter YAML).
    
- Utilise directement les utilitaires `services/yamlPatch.ts` (dont `patchTagsAndMaj`).

- Pas de log Markdown dédié : feedback via la modale de sélection et les notices Obsidian.

### 🌌 Flux : Restes du futur (`src/actions/createRestes.ts`)

- Commande propre au **projet “Restes du futur”**, destinée à créer et relier des notes thématiques.
    
- Suit une logique proche de `createMinutes.ts`, mais orientée texte et exploration documentaire.
    
- Produit des notes interconnectées avec des champs `lien_projet` et `wp_categories`.
    
- YAML maître construit via `buildYamlMaster` (P1/P2).
    
- Pas de journal Markdown ; feedback via notices/diff modale.
    
- Flux harmonisé : même logique que Archives (diff modale P2, YAML maître).

### 🧾 Flux : Logging global (autres modules)

- **Service** `services/actionLogger.ts`
    → Journaux génériques (utilisé aujourd’hui par l’action Tags) **dans `wp_tags/logs_tests/`**.
    
- **Important** : ce service **n’écrit pas** le journal d’**import CSV WP** (géré par `ui/commands.ts` dans `NEW/LOGS/`).
    

### 🧩 Flux : YAML / transformations

- **Core** : `mapping.wordpress.ts` → `yamlMaster.ts` → `bodyRenderer.ts`.
    
- Normalisations via `transform.ts`; garde via `importGuard.ts`.
    
- Upsert stable via `upsert.ts`.
    

### 🪶 Flux : UI / Modales

- `previewModal.ts` (dry-run et choix de dossier).
    
- Modales complémentaires (tags, archives, journal).

