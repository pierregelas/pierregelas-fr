# Roadmap du plugin pierregelas.fr
> **Statut** : actif · **Version du document** : 2.0 · **Dernière mise à jour** : 24/10/2025
> **Références** : CHANGELOG.md · README.md · temp_docs/

## Vision & contexte
Le plugin automatise la production des notes éditoriales du site pierregelas.fr directement depuis Obsidian. Il garantit :
- une génération homogène des contenus Minutes, Journal, Restes/Archives et imports WordPress via un socle YAML partagé ;
- un contrôle qualité avant publication grâce aux validations, diff guidés et historiques Markdown ;
- un packaging « Community Plugin » maintenable pour diffusion interne puis publique.

## Thèmes & initiatives
| Thème | Résultat visé | Statut |
| --- | --- | --- |
| **Socle éditorial** | Génération fiable des notes Minutes, Journal, Restes/Archives et recalcul des titres. | ✅ Livré (v0.1 – v0.5) |
| **Synchronisation WordPress** | Import CSV et mise à jour des tags sans régressions. | ✅ Livré (v0.6 – v0.7) |
| **Paramètres & observabilité** | Centraliser les répertoires, logs et historiques d’exécution. | 🟡 En cadrage |
| **Qualité & publication** | Tests automatisés, packaging ZIP et soumission Community Plugin. | 🟡 En cadrage |
| **Expérience utilisateur** | Prévisualisations, diff détaillés et édition enrichie des notes. | 🟡 Opportunité |

## Livraisons planifiées (engagements)
### Horizon T4 2025
1. **Paramétrage centralisé**
   - Écran Settings unifié pour les chemins Minutes/Journal/Archives/Imports.
   - Compatibilité Windows (gestion des séparateurs, encodages, BOM).
2. **Observabilité unifiée**
   - Logger commun avec niveau de verbosité et archivage Markdown.
   - Tableau de bord récapitulant les imports/export récents.

### Horizon T1 2026
3. **Boucle de validation utilisateur**
   - Prévisualisation/diff avant écriture pour Minutes, Journal, Restes/Archives et recalcul.
   - Confirmation explicite avant écriture disque, avec mise à jour conditionnelle de `maj_wp`.
4. **Industrialisation release**
   - Tests unitaires & intégration (YAML, CSV, tags).
   - Automatisation build + packaging ZIP · Mise à jour manifest & versions · Préparation publication EN/FR.

## Backlog d’opportunités (à investiguer)
- Génération automatique des vignettes vidéo (`_mvign.webp`) et suggestions métadonnées.
- Batch multi-notes (Minutes, Journal, Restes/Archives) avec filtres.
- Diff champ par champ pour import CSV, recalcul et édition de notes.
- Internationalisation avancée (UI bilingue, documentation localisée approfondie).

## Décisions & hors scope
- Variantes alternatives du YAML (clés `post_video_url`, structures custom) sont rejetées pour préserver le socle commun.
- Les automatisations externes (publication WordPress directe, orchestrations hors Obsidian) restent hors périmètre.
- Tests rapides manuels et packaging ZIP ad hoc peuvent être utilisés ponctuellement mais ne remplacent pas l’industrialisation planifiée.

## Suivi de l’avancement
- Les détails par version et corrections sont consignés exclusivement dans `CHANGELOG.md` (format *Keep a Changelog*).
- Les guides d’usage et procédures de contribution sont centralisés dans `README.md`.
- Les spécifications d’actions détaillées vivent dans `temp_docs/workflows/` (une fiche par action) et dans `temp_docs/services-README.md` pour les helpers transverses.
