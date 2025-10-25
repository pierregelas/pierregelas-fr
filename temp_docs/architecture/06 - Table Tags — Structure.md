# Table Tags — Structure et invariants
_Last updated: 2024-10-25 — Plugin v0.7.0_

Cette fiche extrait de l'ancien document `OLD_ACTIONS-gestion_et_mise_a_jour_des_tags.md` les informations de référence sur la table locale des tags Obsidian et les exports WordPress associés.

## Fichiers concernés
- `wp_tags/ob_tags_table.md` — table Markdown maître (frontmatter + table 5 colonnes).
- `wp_tags/csv/AAAA-MM-JJ_export_tags.csv` — exports WordPress utilisés pour la synchronisation.
- `wp_tags/backup/` — sauvegardes horodatées de la table locale (`ob_tags_table_AAAAMMJJ-hhmm.md`).

## Export CSV WordPress (format attendu)
| Colonne | Description |
| --- | --- |
| `wp_tags_id` | Identifiant unique WordPress (entier, non nul). |
| `wp_tags_name` | Nom du tag, casse et accents conservés. |
| `wp_tags_slug` | Slug du tag (minuscule, tirets). |
| `wp_tags_count` | Nombre d’articles associés dans WordPress. |

> Les colonnes sont obligatoires et la commande `updateTagsFromLastCsv` rejette le fichier si l’en-tête diffère.

## Table Markdown `ob_tags_table.md`
```markdown
---
tags_last_udpdate: "AAAA-MM-JJ hh:mm"   # horodatage local lors de la dernière synchro
tags_last_csv: "[[AAAA-MM-JJ_export_tags.csv]]"  # wikilink vers le CSV utilisé
wp_update: false                          # `true` si une remontée vers WordPress est nécessaire
---

| ob_tags_id | ob_tags_name | ob_tags_slug | ob_tags_count | ob_tags_notes |
| ---------- | ------------ | ------------ | ------------- | ------------- |
| 159        | 1er Mai       | 1er-mai      | 9             | obm |
```

### Signification de `ob_tags_notes`
- `obm` : tag modifié localement (slug et/ou name ajusté manuellement).
- `obc` : tag créé localement dans Obsidian (pas encore existant dans WordPress).
- Champ vide : tag aligné sur WordPress.

Ces marqueurs servent aux règles de diff :
- Un tag `obm` conserve son `slug`/`name` local même si le CSV propose une autre valeur.
- Un tag `obc` est considéré comme candidat à une création côté WordPress (`wp_update: true`).

## Rappels d’architecture
- La table doit rester triée par `ob_tags_slug` après chaque mise à jour (`renderTagsTable`).
- Les sauvegardes sont créées avant toute écriture (`backupTagsTable`).
- Les exports CSV sont rangés par date croissante dans `wp_tags/csv/` : la commande choisit le fichier le plus récent.

## Procédure de mise à jour (résumé)
1. Importer le CSV le plus récent (`findLatestCsv`).
2. Lire la table locale (`readTagsTable`).
3. Construire la diff (`buildTagsDiff`) en respectant les 7 groupes métiers : nouveaux tags, mises à jour d’id/name/count, tags locaux à créer/modifier, anomalies.
4. Appliquer la sélection de l’utilisateur (`applyTagsDiff`) et régénérer la table (`renderTagsTable`).
5. Mettre à jour le frontmatter (`tags_last_udpdate`, `tags_last_csv`, `wp_update`) puis sauvegarder + backup.

> Pour les détails opérationnels (modale, logs, paramètres), se référer au workflow [Mise à jour des tags depuis le dernier CSV](../workflows/TagsFromCsv.md).
