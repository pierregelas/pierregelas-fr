# Roadmap du plugin pierregelas.fr
> **Statut** : Actif · **Version du document** : 1.0 · **Dernière mise à jour** : 24/10/2025  
> **Sources** : Minutes, Journal, Restes, Archives, Import WP, Tags, Modifier une note

## Synthèse exécutive
- Le socle v0.1 → v0.7 consolide la génération de notes Minutes, Journal, Restes/Archives et l'import WordPress en partageant un YAML maître unique et des garde-fous homogènes.
- Les commandes critiques (Minutes, Journal, Import WP, Tags) proposent désormais validations, renommages et logs standardisés, assurant une intégration sans erreur des contenus publiables.
- Les prochaines itérations visent la mutualisation des paramètres, la prévisualisation sécurisée avant écriture et l'industrialisation (tests, packaging, publication Community Plugin).
- Des pistes restent en étude (génération de vignettes, batch multi-notes, diff détaillé) avant arbitrage ; certains sujets sont exclus (variantes YAML, automatisations externes).

## Historique des versions livrées

### v0.7.0 — Import WP consolidé & édition Tags (2025-10-22)
- Import CSV WordPress : sélection de la source, preview `created/updated/errors`, différenciation identiques/modifiées et journal Markdown dédié. ([Import WP](./old-documents-for-archives/OLD_ACTION-importer_un_csv_de_wordpress.md))
- Bloc YAML `WP-IMPORT` (`wp_import_dataset_key/id`) avec protections BOM/`sep=`/EOL et erreurs catégorisées `NEW/ERRORS`. ([Import WP](./old-documents-for-archives/OLD_ACTION-importer_un_csv_de_wordpress.md))
- Commande « Modifier une note (v0.1 tags) » : autocomplétion depuis `ob_tags_table.md`, chips éditables et mise à jour conditionnelle de `maj_wp`. ([Modifier une note](./old-documents-for-archives/OLD_ACTION-modifier_une_note.md))

### v0.6.0 — Tags v2 (2025-10-17)
- Lecture CSV/table Markdown avec regroupement des diffs et booléens YAML natifs ; logger conditionnel et backup automatique. ([Tags](./old-documents-for-archives/OLD_ACTIONS-gestion_et_mise_a_jour_des_tags.md))
- Normalisation `ob_tags_slug`, mise à jour `tags_last_update`/`tags_last_csv`, garde d'unicité id/slug et logger Markdown optionnel. ([Tags](./old-documents-for-archives/OLD_ACTIONS-gestion_et_mise_a_jour_des_tags.md))

### v0.2.0 → v0.5.0 — Journal / Archives / Restes (2025-10-15)
- Création de notes Journal : dérivations automatiques des titres, liens `lien_archives`/`lien_restes`, image `_WP.webp` et corps `## Photo`/`## Notes`. ([Journal](./old-documents-for-archives/OLD_ACTION-creer_une_note_journal.md))
- Archives/Restes : diff A/B avec cases décochées si identiques, conversions `_WP.webp→_BF.webp/_REI.webp`, rename guidé et message « zéro différence ». ([Archives](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_archives_du_futur.md) · [Restes](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_restes_du\ futur.md))
- Commande « Journal → Recalculer titres depuis post_titre_1 » : recalcul titres/images/liens, rename conditionnel et réécriture sécurisée. ([Recalcul Journal](./old-documents-for-archives/OLD_ACTION-journal_recalculer_titres_depuis_post_titre_1.md))

### v0.1.0 — Minutes (2025-10-14)
- Commande « Créer une note Minutes » avec modale deux champs, validations URL/nom vidéo et dérivations (`post_date`, `post_titre_*`, `img_filename`, `cover`). ([Minutes](./old-documents-for-archives/OLD_ACTION_creer_une_note_minutes.md))
- Frontmatter maître complet (`maj_wp: true`, `post_cat: [video, minutes]`) et corps standardisé (`## Vignette`/`## Vidéo`/`## Notes`) ; nommage fichier `post_titre_full`. ([Minutes](./old-documents-for-archives/OLD_ACTION_creer_une_note_minutes.md))

## 🔜 À venir (commitments / backlog priorisé)
- [ ] Paramétrage centralisé (Settings) pour dossiers, compatibilité Windows et normalisation partagée. ([Vision plugin](./old-documents-for-archives/OLD_creation_d_un_community_plugin_pour_creation_de\ notes.md))
- [ ] Previews/diffs avant écriture pour Minutes, Journal, Archives/Restes et Recalcul. ([Minutes](./old-documents-for-archives/OLD_ACTION_creer_une_note_minutes.md) · [Journal](./old-documents-for-archives/OLD_ACTION-creer_une_note_journal.md) · [Archives](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_archives_du_futur.md) · [Restes](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_restes_du\ futur.md) · [Recalcul](./old-documents-for-archives/OLD_ACTION-journal_recalculer_titres_depuis_post_titre_1.md))
- [ ] Logger commun et panneau d'historique des imports/exports Markdown. ([Vision plugin](./old-documents-for-archives/OLD_creation_d_un_community_plugin_pour_creation_de\ notes.md) · [Tags](./old-documents-for-archives/OLD_ACTIONS-gestion_et_mise_a_jour_des_tags.md))
- [ ] Tests unitaires & intégration (YAML, CSV, patch tags) + automatisation CI locale. ([Vision plugin](./old-documents-for-archives/OLD_creation_d_un_community_plugin_pour_creation_de\ notes.md) · [Modifier une note](./old-documents-for-archives/OLD_ACTION-modifier_une_note.md) · [Import WP](./old-documents-for-archives/OLD_ACTION-importer_un_csv_de_wordpress.md))
- [ ] Publication Community Plugin (manifest, versions, README, icône) et internationalisation minimale EN/FR. ([Vision plugin](./old-documents-for-archives/OLD_creation_d_un_community_plugin_pour_creation_de\ notes.md))

## 🧪 À évaluer (discovery / opportunités)
- [ ] Génération automatique de vignettes `_mvign.webp` et suggestions métadonnées vidéo pour Minutes. ([Minutes](./old-documents-for-archives/OLD_ACTION_creer_une_note_minutes.md))
- [ ] Batch multi-notes (Minutes, Journal, Restes/Archives) avec filtres/selection. ([Minutes](./old-documents-for-archives/OLD_ACTION_creer_une_note_minutes.md) · [Journal](./old-documents-for-archives/OLD_ACTION-creer_une_note_journal.md) · [Restes](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_restes_du\ futur.md) · [Archives](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_archives_du_futur.md))
- [ ] Diff détaillé avant écriture (champ par champ) pour import/recalcul/actions YAML. ([Import WP](./old-documents-for-archives/OLD_ACTION-importer_un_csv_de_wordpress.md) · [Recalcul](./old-documents-for-archives/OLD_ACTION-journal_recalculer_titres_depuis_post_titre_1.md) · [Modifier une note](./old-documents-for-archives/OLD_ACTION-modifier_une_note.md))

## ❌ Rejeté (décisions actées)
- [ ] Variantes multiples de la clé `post_video_url` : standard conservé `post_vid_url`. ([Minutes](./old-documents-for-archives/OLD_ACTION_creer_une_note_minutes.md))
- [ ] Génération inverse Restes → Journal et fusion tags+catégories côté import : non retenues. ([Restes](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_restes_du\ futur.md) · [Archives](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_archives_du_futur.md) · [Import WP](./old-documents-for-archives/OLD_ACTION-importer_un_csv_de_wordpress.md))
- [ ] Auto-quoting généralisé du YAML importé : nettoyage côté WordPress requis en amont. ([Import WP](./old-documents-for-archives/OLD_ACTION-importer_un_csv_de_wordpress.md))

## Décisions hors scope
- Paramètres légers du plugin, tests rapides et packaging ZIP restent hors périmètre immédiat. ([Vision plugin](./old-documents-for-archives/OLD_creation_d_un_community_plugin_pour_creation_de\ notes.md))
- Publication WordPress directe ou automatisations externes ne font pas partie du plugin. ([Vision plugin](./old-documents-for-archives/OLD_creation_d_un_community_plugin_pour_creation_de\ notes.md))

## Journal des jalons

### 2025-10-22 — v0.7 stabilisé
> Import CSV WP consolidé + commande « Modifier une note (v0.1 tags) »
- Preview `created/updated/errors`, journal Markdown et distinction identiques/modifiées. ([Import WP](./old-documents-for-archives/OLD_ACTION-importer_un_csv_de_wordpress.md))
- Bloc YAML `WP-IMPORT` avec garde anti-régression. ([Import WP](./old-documents-for-archives/OLD_ACTION-importer_un_csv_de_wordpress.md))
- Modale tags avec autocomplétion `ob_tags_slug`, chips éditables et `maj_wp` conditionnel. ([Modifier une note](./old-documents-for-archives/OLD_ACTION-modifier_une_note.md))

### 2025-10-17 — v0.6 Tags v2
> Synchronisation tags WordPress → Obsidian
- Regroupement des diffs, booléens YAML natifs, backup `wp_tags/backup` et notice dédiée. ([Tags](./old-documents-for-archives/OLD_ACTIONS-gestion_et_mise_a_jour_des_tags.md))
- Mise à jour `tags_last_update`/`tags_last_csv`, garde d'unicité id/slug et logger optionnel. ([Tags](./old-documents-for-archives/OLD_ACTIONS-gestion_et_mise_a_jour_des_tags.md))

### 2025-10-15 — v0.2 à v0.5 Journal / Archives / Restes
> Alignement sur le YAML maître et rename/diff guidés
- Création Journal (`post_titre_*`, `lien_archives`/`lien_restes`, corps `## Photo`/`## Notes`). ([Journal](./old-documents-for-archives/OLD_ACTION-creer_une_note_journal.md))
- Archives/Restes : diff A/B, conversions `_WP.webp→_BF.webp/_REI.webp`, rename conditionnel, message « parfaitement à jour ». ([Archives](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_archives_du_futur.md) · [Restes](./old-documents-for-archives/OLD_ACTION-creer_mettre_a_jour_une_note_restes_du\ futur.md))

### 2025-10-14 — v0.1 Minutes
> Lancement de la commande Minutes
- Modale deux champs, validations vidéo/URL et dérivations `post_*`. ([Minutes](./old-documents-for-archives/OLD_ACTION_creer_une_note_minutes.md))
- Frontmatter maître `maj_wp`, `post_cat` et corps standard. ([Minutes](./old-documents-for-archives/OLD_ACTION_creer_une_note_minutes.md))

