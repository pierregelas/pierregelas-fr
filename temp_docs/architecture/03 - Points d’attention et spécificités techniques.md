# Points d’attention et spécificités techniques
_Last updated: 2025-10-23 — Plugin v0.1.0_

## Invariants techniques (à ne pas casser)
- Source unique des erreurs: le journal d’import lit uniquement `summary.error_records` (collecté en mémoire dans `actions/importWordpress.ts`) et n’effectue jamais de parsing des fichiers `ERROR_*`.
- Bloc `## Erreurs` du journal d’import: rendu par `ui/commands.ts`, avec sous-lignes dans l’ordre fixe `wp_error` → `post-id` → `wp_row_index` → `wp_id_raw` → `wp_titre_raw` → `error_type`, et sans ligne vide entre items.
- Séparation des journaux: Import CSV WP → `NEW/LOGS/`; services (ex. Tags) → `wp_tags/logs_tests/`.
- Conventions CSV: `wp_tags` séparés par `,`; `wp_categories` hiérarchisés avec `>`; images multiples via `||`.
- YAML frontmatter: généré via core (`yamlMaster.ts`), patchs via services (`yamlPatch.ts`); ne pas contourner ces couches depuis l’UI.
- Listes wikilink (`lien_projet`, `post_cat` dérivés WP) sérialisées via `pushYamlList` → items forcés en `'[[...]]'` (apostrophes internes doublées) pour éviter le rendu `[[["..."]]]` d’Obsidian.
- Les champs multiligne comme `img_legende` sont sérialisés en YAML via des blocs littéraux (`|`) avec indentation standard, assurant leur validité dans le frontmatter Obsidian.

## Feuille de route de migration (commands → actions)
- Étape 1 — Minutes : migrée vers `src/actions/createMinutes.ts` (MasterFields + YAML maître unifié).
- Étape 2 — Journal : `src/actions/createJournal.ts` + `journalRecalc.ts` utilisent désormais `buildYamlMaster` (cf. utils journal).
- Étape 3 — Archives : `src/actions/createArchives.ts` gère P1/P2 avec diff modale et YAML maître.
- Étape 4 — Restes : `src/actions/createRestes.ts` couvre P1/P2. ModifyNote reste à finaliser côté journaux.
- Étape 5 — Logger: évaluer la fusion “UI log writer” et “services/actionLogger.ts” sous une interface commune si les cibles de dossiers convergent.

## Références croisées internes
- README: installation, commandes, configuration avancée, FAQ, exemples.
- temp_docs/architecture/01 - Structure du plugin (vue par dossier).md: responsabilités par fichier.
- temp_docs/architecture/02 - Flux fonctionnels du plugin.md: pipelines complets par flux.
- workflows/: scénarios détaillés (Minutes, Journal, Archives, Tags) — à maintenir en parallèle des migrations.
- troubleshooting/: checklists et arbres de décision — ajouter des cas concrets au fur et à mesure des bugs résolus.

## Mini check QA (avant tout merge ou refactor)
- La commande “Importer un CSV WordPress” génère bien `NEW/LOGS/import-*.md` dans le vault.
- La section `## Erreurs` du journal contient le détail par erreur avec l’ordre de champs imposé, et sans ligne vide entre items.
- `ImportSummary.error_records` est rempli côté action et consommé côté UI; aucun fallback disque sur les `ERROR_*`.
- Les journaux Tags restent écrits dans `wp_tags/logs_tests/` (aucune régression de cible).
- Les sections “Modifiées/Identiques” listent correctement les chemins et, pour “Modifiées”, les champs modifiés.

## Scripts et commandes utiles (local)
- Installation des dépendances: `npm ci`
- Build rapide: `npm run build`
- Artefacts vers Obsidian: copier `manifest.json`, `main.js`, `styles.css` dans `.obsidian/plugins/pierregelas-fr`
- Démo import: placer un CSV d’essai dans le vault (ex. `INBOX/exports/demo.csv`), lancer la palette → “Importer un CSV WordPress”, vérifier le journal dans `NEW/LOGS/`.

## Échantillons et exemples (à enrichir)
- YAML généré (extrait minimal) — voir README: section “Exemples”.
- Journal — sections “Modifiées” et “Erreurs” (exemples) — voir README.
- CSV d’essai: conserver un petit dataset 4 lignes (OK, TITRE_MANQUANT, LIGNE_VIDE, ID_INVALIDE) dans `temp_docs/workflows/examples/`.

## Pratiques de debug
- En cas d’erreurs nombreuses: ouvrir le journal `NEW/LOGS/import-*.md`, trier visuellement par `wp_row_index`, corriger le CSV, relancer.
- Si une note n’est pas “Modifiée” alors qu’on s’y attend: vérifier la liste “champs modifiés” et le mapping dans `core/mapping.wordpress.ts`.
- Si un lien `[[ERROR_*]]` est orphelin: vérifier la génération du nom dans l’action (construction de `errorFileWikilink`) et l’existence du fichier d’erreur dans le vault.

## Versionnage des docs
- Chaque fichier sous `temp_docs/` doit inclure: `_Last updated: YYYY-MM-DD — Plugin vX.Y.Z_`
- À chaque migration ou changement de flux, mettre à jour:
  - 01 - Structure du plugin (vue par dossier).md
  - 02 - Flux fonctionnels du plugin.md
  - README (si impact utilisateur)
  - workflows/ correspondants
