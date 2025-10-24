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

- [Documentation interne](#documentation-interne)

- [Historique des versions](#historique-des-versions)

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
@@ -209,50 +211,54 @@ Dans `## Erreurs` du journal d’import, chaque entrée **sans ligne vide entre
        
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
    
    `## Erreurs - [[ERROR_7414_sans-titre]]     - wp_error: post_titre_full manquant     - post-id: 7414     - wp_row_index: 28     - wp_id_raw: "7414"     - wp_titre_raw: "Sans titre"     - error_type: TITRE_MANQUANT`
    

## Documentation interne

Retrouve l’architecture complète du plugin, la description des flux fonctionnels, les points d’attention techniques et la feuille de route dans [`temp_docs/architecture/`](temp_docs/architecture/). Commence par **05 - Documentation interne — Structure et liens.md**, qui agit comme hub vers les autres documents.

Pour les modales utilisateurs, un guide spécifique est disponible dans [`temp_docs/modals-README.md`](temp_docs/modals-README.md).

Les helpers de bas niveau et leurs points de vigilance sont décrits dans [`temp_docs/services-README.md`](temp_docs/services-README.md), tandis que les scénarios complets (import WordPress, Archives, Minutes, Journal, Tags, etc.) sont détaillés dossier par dossier dans [`temp_docs/workflows/`](temp_docs/workflows/).

## Historique des versions

Les nouveautés par version sont centralisées dans [`CHANGELOG.md`](CHANGELOG.md), structuré selon la convention **Keep a Changelog**. Chaque nouvelle release doit y être documentée avant publication.

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
