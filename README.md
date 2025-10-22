# pierregelas-fr — Plugin Obsidian

Outils d’édition et d’import pour un vault Obsidian (contenus WordPress, notes, journaux). Le dépôt **plugin** est ici, la documentation publique associée est dans `pierregelas-fr-docs`.

## Sommaire

- [Prérequis & compatibilité](#pr%C3%A9requis--compatibilit%C3%A9)
    
- [Fonctionnalités](#fonctionnalit%C3%A9s)
    
- [Installation](#installation)
    
- [Commandes (palette)](#commandes-palette)
    
- [Guide d’utilisation](#guide-dutilisation)
    
- [Journaux (logs)](#journaux-logs)
    
- [Format des erreurs](#format-des-erreurs)
    
- [Configuration avancée](#configuration-avanc%C3%A9e)
    
- [Résolution de problèmes (FAQ)](#r%C3%A9solution-de-probl%C3%A8mes-faq)
    
- [Exemples](#exemples)
    
- [Contribuer & Dev](#contribuer--dev)
    
- [Licence](#licence)
    

## Prérequis & compatibilité

- Obsidian desktop ≥ 1.5 (API de fichiers et modales utilisées)
    
- Node.js ≥ 18 et npm ≥ 9 (build local)
    
- Un export **CSV WordPress** contenant a minima `wp_id`, `wp_titre`, `wp_date`, `wp_categories`, `wp_status` + colonnes images si besoin (`wp_img_*`)
    
- Plateformes testées: macOS (Intel/Apple Silicon). Windows/Linux non bloquants mais non testés de manière exhaustive
    

## Fonctionnalités

- Import CSV WordPress avec **prévisualisation (dry-run)**, choix du dossier, création/mise à jour de notes, et **journal Markdown**
    
- Différenciation **Modifiées** vs **Identiques**, avec **liste des champs modifiés** par note
    
- Fichiers d’**erreur** individuels (`ERROR_*`) et **récapitulatif détaillé** dans le journal
    
- Outils YAML/mapping pour un frontmatter propre et stable
    
- Actions complémentaires (journal, minutes, archives, tags) prêtes à étendre
    

## Installation

- Copier le dossier du plugin dans `.obsidian/plugins/pierregelas-fr`
    
- Relancer Obsidian puis **activer** le plugin dans _Paramètres → Plugins communautaires_
    
- Option build local:
    
    - `npm ci`
        
    - `npm run build`
        
    - copier `manifest.json`, `main.js`, `styles.css` dans `.obsidian/plugins/pierregelas-fr`
        

## Commandes (palette)

- **pierregelas.fr: Importer un CSV WordPress**
    
- **pierregelas.fr: Modifier une note (v0.1 tags)** _(si activée dans ta build)_
    

## Guide d’utilisation

### Import CSV WordPress (flux complet)

- Préparer le `.csv` dans ton vault (ex. `INBOX/exports/mon_export.csv`)
    
- Palette → **Importer un CSV WordPress**
    
- Sélectionner le CSV → la **prévisualisation (dry-run)** s’ouvre:
    
    - Totaux: créés, mises à jour (identiques/modifiées), erreurs
        
    - Aperçu par note (champs modifiés)
        
- Choisir le **dossier de sortie** (par défaut `NEW/`)
    
- Lancer l’import réel:
    
    - Écriture/MAJ des notes (YAML + corps)
        
    - Création des fichiers d’erreur `ERROR_*` si besoin
        
    - Génération du **journal Markdown** dans `NEW/LOGS/`
        
- Ouvrir le journal `NEW/LOGS/import-YYYYMMDD-HHMMSS.md`:
    
    - **Créés**, **Modifiées** (avec champs modifiés), **Identiques**, **Erreurs** (détails)
        

### Notes sur d’autres flux (aperçu rapide)

- **Minutes**: création de notes vidéo avec champs dédiés (via commandes associées)
    
- **Journal**: recalcul des index chronologiques et connexions
    
- **Archives/Restes du futur**: commandes pour synchroniser des sections spécifiques
    
- **Tags**: synchronisation table/CSV, journaux dédiés
    

## Journaux (logs)

- Import CSV WP: journal Markdown écrit par l’UI dans `NEW/LOGS/import-YYYYMMDD-HHMMSS.md`
    
- Sections:
    
    - **Résumé**
        
    - **Créés**
        
    - **Modifiées** _(avec champs modifiés)_
        
    - **Identiques**
        
    - **Erreurs** _(voir format ci-dessous)_
        
- Autres modules (ex. Tags): logs via service générique dans `wp_tags/logs_tests/`
    

## Format des erreurs

Dans `## Erreurs` du journal d’import, chaque entrée **sans ligne vide entre items**:

- `[[ERROR_<…>]]`
    
    - `wp_error: <message>`
        
    - `post-id: <id>`
        
    - `wp_row_index: <index>`
        
    - `wp_id_raw: <valeur>`
        
    - `wp_titre_raw: <valeur>`
        
    - `error_type: <TITRE_MANQUANT | LIGNE_VIDE | ID_INVALIDE | …>`  
        Notes:
        
- Source unique: **pas** de relecture des fichiers `ERROR_*`; tout provient de la collecte **en mémoire** pendant l’import
    
- Les `ERROR_*` servent de liens (wikilinks) et d’inspection fine
    

## Configuration avancée

- Dossier de sortie par défaut: `NEW/`
    
- Journal d’import: `NEW/LOGS/`
    
- Convention d’erreurs: `ERROR_<post_id ou ?>_<slug-titre>.md`
    
- Changement des chemins/logs:
    
    - Import WP: géré dans `src/ui/commands.ts` (écriture du journal d’import)
        
    - Services (ex. Tags): dossier configurable dans `src/services/actionLogger.ts` (`LOGS_DIR`)
        
- YAML `WP-IMPORT` (métadonnées dataset) ajouté lors de l’import: clés `wp_import_dataset_key`, `wp_import_dataset_id`
    
- Conventions CSV:
    
    - `wp_tags`: séparateur `,`
        
    - `wp_categories`: hiérarchie `A>B>C`
        
    - Images: multi `||`
        
- Personnalisations possibles (dev): mapping WordPress, normalisations (`transform`), garde d’import
    

## Résolution de problèmes (FAQ)

- **CSV introuvable dans la modale**
    
    - Vérifier que le fichier a bien l’extension `.csv` et se trouve **dans le vault**
        
    - Si le dossier n’existe pas, créer puis réindexer Obsidian (recharger la vault)
        
- **Noms d’images en conflit (ex. `.webp`)**
    
    - Le plugin crée des chemins uniques; si collision manuelle, renommer le fichier ou déplacer le dossier cible
        
- **Aucune note “Modifiée” alors que j’ai changé le CSV**
    
    - Vérifier le diff: seules les colonnes mappées modifient la note
        
    - Regarder la section **Modifiées** du journal: les **champs modifiés** y sont listés
        
- **Erreurs nombreuses (LIGNE_VIDE, TITRE_MANQUANT, ID_INVALIDE)**
    
    - Ouvrir `## Erreurs` dans le journal; corriger le CSV à la ligne indiquée (`wp_row_index`) puis relancer
        
- **Tags non synchronisés**
    
    - Vérifier le CSV des tags et les logs du service (répertoire `wp_tags/logs_tests/`)
        
- **Performance**
    
    - Traiter en lots raisonnables; éviter les CSV massifs si la vault est volumineuse
        

## Exemples

- **YAML généré (extrait)**
    
    `cover: null post_id: "7414" post_titre_full: "Sans titre" post_date: "2024-05-01T16:40:00" wp_status: "pending" tags:   - minutes`
    
- **Journal — section “Modifiées” (exemple)**
    
    `## Modifiées - [[Mon-Article]] — champs modifiés: post_titre_full, wp_status`
    
- **Journal — section “Erreurs” (exemple)**
    
    `## Erreurs - [[ERROR_7414_sans-titre]] 	- wp_error: post_titre_full manquant 	- post-id: 7414 	- wp_row_index: 28 	- wp_id_raw: "7414" 	- wp_titre_raw: "Sans titre" 	- error_type: TITRE_MANQUANT`
    

## Contribuer & Dev

- Contribuer:
    
    - Proposer des issues/PR
        
    - Conventions: TypeScript strict, lint standard, pas de dépendances lourdes non nécessaires
        
    - Workflow: branche courte + PR, description claire du flux touché (UI/Actions/Core/Services)
        
- Dev (local):
    
    - `npm ci`
        
    - `npm run build`
        
    - copier artefacts dans `.obsidian/plugins/pierregelas-fr`
        
- Tests manuels:
    
    - CSV 4 cas: 1 OK, 1 `wp_titre` vide, 1 ligne vide, 1 `wp_id` non numérique
        
    - Vérifier sections **Créés/Modifiées/Identiques** + **Erreurs**
        

## Licence

- MIT (voir `LICENSE`)