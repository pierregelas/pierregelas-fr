# YAML maître — Structure et conventions
_Last updated: 2025-10-24 — Plugin v0.7.0_

Le YAML maître est le frontmatter de référence partagé par toutes les notes générées par le plugin (Minutes, Journal, Archives, Restes, import WordPress). Il garantit un ordre de champs, des sections et des types homogènes pour faciliter les diff, les imports CSV et les automatisations externes. Cette fiche synthétise les pratiques issues des anciens documents `OLD_ACTION-*.md` et de l’implémentation actuelle (`src/core/yamlMaster.ts`).

## Modules concernés
- `src/core/yamlMaster.ts` : définition des gabarits (`MasterTemplate`), normalisation (`normalizeMasterFields`) et sérialisation (`emitYaml`, `buildYamlMaster`, `buildRestesYaml`, `buildArchivesYaml`, `buildJournalYaml`, `buildMinutesYaml`).
- `src/core/types.ts` : contrat `MasterFields`, consommé par toutes les actions.
- Actions créatrices/mises à jour : `createMinutes.ts`, `createJournal.ts`, `createArchives.ts`, `createRestes.ts`, `importWordpress.ts` — elles appellent les builders YAML puis écrivent le document (cf. workflows `temp_docs/workflows/create*.md`).
- Services complémentaires : `yamlBuilder.ts` (blocs multiligne), `yamlPatch.ts` (mises à jour ciblées), `tags.ts` / `actionLogger.ts` (patchs et journaux reposant sur le frontmatter existant).

## Structure standard du YAML maître
Les sections sont émises dans un ordre fixe, chacune séparée par une ligne soulignée (`YAML_SECTION_LINES`). Les séparateurs ne doivent jamais être retirés.

1. `cover`
2. `IMAGES` — listes `img_alt`, `img_descr`, `img_filename`, `img_id` (⚠️ quotées), `img_legende` (bloc multiligne), `img_titre`, `img_url`
3. `LIEN` — `lien_archives`, `lien_journal`, `lien_projet` (liste de wikilinks), `lien_restes`
4. `MAJ` — `maj_wp`
5. `POST` — `post_cat` (liste hiérarchique), `post_date`, `post_descr`, `post_extrait`, `post_id`, `post_mod`, `post_perma`, `post_titre_1`, `post_titre_2`, `post_titre_full`, `post_vid_url`, `tags`
6. `WP` — `wp_carnet_link`, `wp_carnet_on`, `wp_status`
7. `WP-IMPORT` — `wp_import_dataset_id` (chaîne vide par défaut, valeur numérique stockée sous forme de chaîne), `wp_import_dataset_key`

### Règles de typage et de formatage
- Les champs scalaires sont émis via `emitScalar` : booléens explicites (`true/false`), nombres sans guillemets, chaînes vides si valeur absente.
- Les listes sont systématiquement rendues avec un en-tête et des tirets (`emitList`), même pour zéro élément (`[]`). Les wikilinks sont forcés en quotes simples (`pushYamlList`).
- `img_id` est toujours quoté pour éviter les conversions numériques côté Obsidian.
- `img_legende` est sérialisé en bloc `pushYamlBlock` pour préserver les retours à la ligne.
- `wp_import_dataset_id` et `wp_import_dataset_key` sont échappés (`escapeYaml`) afin de tolérer les valeurs vides ou numériques.

## Normalisation avant émission
Chaque builder commence par `createEmptyMasterFields()` puis fusionne les valeurs fournies. `normalizeMasterFields()` applique :
- Chaînes nettoyées (`trim`), conversion `null`/vide cohérente (`normalizeString`, `normalizeNullableString`).
- Booléens robustes (`normalizeBoolean`) acceptant `"true"/"false"`, `0/1`, `yes/no`.
- Listes issues d’une chaîne ou d’un tableau (`normalizeStringArray`, `normalizeRawList`).
- `img_legende` converti en segments séparés par double saut de ligne (`normalizeImgLegende`).
- `wp_import_dataset_id` converti en nombre si possible (`normalizeNumber`).

L’appel à `emitYaml()` ajoute les délimiteurs `---` au début et à la fin et garantit l’ordre des sections. Aucun module en dehors de `yamlMaster.ts` ne doit concaténer manuellement le YAML maître.

## Variants par template (actions)
Chaque action enrichit la base avec ses valeurs par défaut avant normalisation :

| Template | Champs forcés | Particularités |
| --- | --- | --- |
| `restes` | `maj_wp = true`, `lien_projet = [[Photo]], [[Restes du futur]]`, `post_cat = [photo, restes-du-futur]`, `post_vid_url = ""`, `wp_carnet_on = false`, `tags = []`, `post_mod = post_date` si absent | Utilisé pour la création et la mise à jour (diff) des Restes du futur. |
| `archives` | Même logique que Restes mais catégories `photo, archives-du-futur` et liens `[[Photo]], [[Archives du futur]]`. | Reprise du YAML Journal lors des diff Archives. |
| `journal` | `maj_wp = true`, catégories `photo, journal-photo`, `wp_import_dataset_* = null`, `tags = []`, `post_vid_url = null`. | Sert de source pour Archives/Restes via `normalizeMasterFields`. |
| `minutes` | `maj_wp = true`, catégories `video, minutes`, `lien_projet = [[Vidéo]], [[Minutes]]`, `post_vid_url = ""`, `wp_import_dataset_* = null`. | Notes vidéo : corps conditionnel (Vignette/Vidéo/Notes). |

Les actions `create*` remplissent ensuite les champs spécifiques (titres, dates, liens, tags) avant de passer à `buildXxxYaml()`.

## Champs critiques et invariants
- `post_id` : clé d’idempotence (import CSV, mises à jour). Toujours présent même pour les créations locales (initialisé vide mais pas supprimé).
- `post_titre_full` : reflète le titre exact côté WordPress ; les recalculs Journal reposent dessus.
- `maj_wp` : indicateur de synchronisation ; certaines actions (Tags) le basculent à `true` lorsqu’un changement local nécessite une remontée.
- `tags` : liste slugifiée ; l’action Tags garantit la cohérence via `patchTagsAndMaj`.
- `wp_import_dataset_key` / `wp_import_dataset_id` : verrou anti-régression CSV (voir ci-dessous). Absents ⇒ notes legacy non bloquantes.

## Anti-régression CSV (`WP-IMPORT`)
Introduit suite à l’ancienne spécification `OLD_ACTION-importer_un_csv_de_wordpress.md`, ce bloc empêche de rejouer un CSV plus ancien pour une même famille :
1. Les CSV suivent la convention `<dataset_key>_<dataset_id>_PG.csv` (`dataset_id` = `YYYYMMDD`).
2. À l’import, le frontmatter cible est scanné : on récupère le `max(dataset_id)` par `dataset_key` pour bloquer un ID inférieur et alerter sur un ID identique.
3. `wp_import_dataset_id` est stocké en nombre (mais émis sous forme de chaîne) afin de faciliter les comparaisons.
4. Les notes sans bloc `WP-IMPORT` restent importables ; le premier import y ajoute le bloc complet.

## Interactions et mises à jour
- `yamlPatch.ts` applique des mises à jour partielles tout en conservant l’ordre des clés (`applyYamlPatch`, `patchTagsAndMaj`).
- `tags.ts` et `actionLogger.ts` relisent le frontmatter existant pour injecter des compteurs ou des indicateurs sans casser la structure.
- `services/tagsTable.ts` conserve le frontmatter original (`yamlWithDelimiters`) lorsqu’il réécrit la table Markdown, évitant de dupliquer le YAML maître.
- `src/services/fileUtils.ts` et `core/upsert.ts` assemblent toujours `yaml + body` après génération (`createNoteFile`, `write`), ce qui impose de fournir un frontmatter complet.

## Bonnes pratiques
- Centraliser toute évolution du schema dans `MasterFields` et `yamlMaster.ts`, puis propager vers les actions/templates.
- Ajouter les nouveaux champs en fin de section pour limiter les diff ; documenter immédiatement l’usage dans cette fiche et dans `temp_docs/workflows/`.
- Préférer `normalizeMasterFields` à toute lecture directe du YAML : il gère les conversions d’anciens formats (strings → listes, booléens laxistes, etc.).
- Tester les modifications avec les commandes Minutes/Journal/Archives/Restes et l’import CSV pour vérifier la compatibilité des sections.
