---
date_maj: 2025-10-19
doc_id: projet_plugin_notes
docs_file_tree_url: https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/docs_file_tree_url.md
docs-repo: https://github.com/pierregelas/pierregelas-fr-docs
etat: courant
plugin_file_tree_url: https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/plugin_file_tree_url.md
plugin-repo: https://github.com/pierregelas/pierregelas-fr
rAwUrl: <URL_raw_du_doc_sur_github>
titre: Création d’un community plugin pour création de notes
type_doc: projet
version: v0.7
---

# PROJET — Création d’un community plugin pour création de notes

## tl,dr
- Base **`src/core/*`** mutualisée; actions Minutes, Journal, Archives/Restes, Recalcul Journal, Tags v2, Import CSV WP opérationnelles.
- Import CSV WP **stabilisé**: preview fiable, écriture **WP-IMPORT** dans le YAML, **anti-régression** sur le **nom CSV v2**, logs NEW/LOGS, erreurs NEW/ERRORS.
- v0.7 en cours: **édition de tags** (autocomplétion) et **Modifier une note (v0.1 tags)**; prochaine étape: catégories, paramétrage centralisé, logger commun.
## Description
*Ton contenu libre : contexte, objectifs détaillés, principes, exigences, exemples, notes… (source de vérité, jamais modifiée automatiquement)*

Après l'échec de la première tentative de création de plugin, nous repartons sur une méthode plus robuste et plus fiable.

### Introduction

Création d'un community plugin pour création de notes

Basiquement pouvoir créer des notes avec des réglages précis suivant les projets, pour ensuite pouvoir export des csv au bon format pour importer dans wordpress et créer automatiquement les notes via `WP Import Export Lite`

L'objectif est d'avoir une version 0.1 parfaitement fonctionnelle avec les actions suivantes à créer :

### Manifeste

```json
{
  "id": "pierregelas-fr",
  "name": "pierregelas.fr",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "Création automatisée de notes liées au site pierregelas.fr",
  "author": "Pierre Gelas",
  "authorUrl": "https://pierregelas.fr",
  "isDesktopOnly": true
}
```

### Robustesse
Il est très important de voir les choses dans un cadre général et de hauteur, pour simplifier le code, l'alléger, selon les normes demandées par Obsidian pour les community manager dans le document [[AGENTS_obsidian_community_plugin]]

Il est également indispensable de toujours consulter https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin et ses sous-pages qui contiennent toutes les informations nécessaires.

### Roadmap (alignée avec les logs)

#### ✅ Livré

- **v0.1 — 2025-10-14 : Bootstrap + Minutes**  
    Plugin initial (template, build, watch) + action **Minutes** (modale, validations, YAML complet).
    
- **v0.2 — 2025-10-15 : Journal**  
    Action **Journal** (titre sans heure, format image `AAAA-MM-JJ-hh-mm_id_WP.webp`, YAML complet).
    
- **v0.3 — 2025-10-15 : Archives du futur (P1)**  
    Création depuis une note **Journal photo** (préconditions, dérivations titres/IMG, `_WP.webp→_BF.webp`, YAML complet).
    
- **v0.4 — 2025-10-15 : Archives du futur (P2) + commande Journal**  
    Commande **« Journal → Recalculer titres depuis post_titre_1 »** (recalcule titres/liens + rename si besoin).  
    P2: modale **Diff** avec cases **décochées si identiques**, patch YAML **in-place**, rename proposé si le titre change, modale **“parfaitement à jour”** si 0 diff.
    
- **v0.5 — 2025-10-15 : Restes du futur (P1/P2, _WP→_REI)**  
    Même mécanique qu’Archives (création + mise à jour) avec conversions d’image `_WP.webp→_REI.webp`, `post_cat=["photo","restes-du-futur"]`, `lien_projet=[[Photo]], [[Restes du futur]]`, diff A/B identique (cases décochées si identiques), rename proposé, modale **“parfaitement à jour”** si 0 diff.
    
- **v0.6 — 2025-10-17 : Tags v2 (WP→Obsidian)**  
Action **Tags** v2: modale toujours affichée (7 groupes), booléens YAML **natifs** (`wp_update`), **logger conditionnel** (ON/OFF), **onglet Paramètres**.
    
- [x] Squelette plugin v2 avec `src/core/` mutualisé.
- [x] Première action branchée (import WordPress CSV) + UI commande.
#### 🔜 À venir

- **v0.6 (partie 2) — Améliorations Tags**  
Sélecteur de CSV (au lieu du “dernier” seulement) • Niveaux de verbosité du logger (normal/minimal) • Rotation des logs (conserver N derniers).
    
- **v0.7 — Ajout de tags (ajout dans les actions)**  
    possibilité d'Ajout de tags avec autocomplétion dans les fenêtres modales de création (Minutes, Journal, Archives)  
    Uniformisation de la sélection/mise à jour des `tags` dans les différentes actions.
    
- **v0.8 — Gestion du dossier catégories et synchronisation**  
    basé sur le même fonctionnement et architecture que le dossier tags
    
- **v0.? — Gestion des settings et dossier de création des notes**
	commencer à construire les settings du plugin, d'abord pour définir les chemins de création des Actions, ainsi que des dossiers tags et catégorie
	
- **v0.x — Logger commun (Minutes/Journal/Archives/Restes)**  
Brancher le logger conditionnel (ON/OFF) sur toutes les actions pour des traces uniformes.

- **v0.x - Créer une action Sanity / Cohérence check.
	- parcourir les notes et générer un log suivant certains critères
		- exemple : Avertissement ! Cette note n'a pas de titre_1 et titre_2


- [ ] Migrer progressivement les autres actions sur `@core/*` (sans casse).
- [ ] Paramétrage centralisé (Settings tab) pour options communes (dossiers, nommage, compat Windows, normalisation).
- [ ] Panneau “Logs d’import” intégré (historique, export .md).
- [ ] Tests unitaires & intégration (CI locale).
- [ ] Publication Community Plugin : checklist Obsidian (manifest, versions, README, icône).
- [ ] Documentation développeur (diagrammes de flux, conventions YAML maître).
- [ ] Internationalisation minimale (EN/FR) des libellés UI.
- [ ] Télémetrie optionnelle (opt‑in) pour métriques anonymisées (volumétrie import).

> Encadré (hors-scope, à noter pour plus tard)
> 
> - **Paramètres du plugin** (toggles simples, valeurs par défaut).
>     
> - **Tests rapides** (quelques fonctions clés).
>     
> - **Packaging release** (build propre + ZIP build minimal).  
>     Ces éléments ne sont pas requis par tes docs actuels, je les note juste pour garder une trajectoire propre.
>

## Navigation GitHub

- - Repo plugin: [https://github.com/pierregelas/pierregelas-fr](https://github.com/pierregelas/pierregelas-fr?utm_source=chatgpt.com)
- Repo docs: [https://github.com/pierregelas/pierregelas-fr-docs](https://github.com/pierregelas/pierregelas-fr-docs?utm_source=chatgpt.com)
- Index RAW (plugin): [https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/plugin_file_tree_url.md](https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/plugin_file_tree_url.md?utm_source=chatgpt.com)
- Index RAW (docs): [https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/docs_file_tree_url.md](https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/docs_file_tree_url.md?utm_source=chatgpt.com)

## Architecture & conventions

- - Noyau: `src/core/*` (types, transform, yamlMaster, mapping, csv, files, upsert, log).
- Actions dédiées + modales; logs Markdown par action si pertinent; erreurs d’import en `NEW/ERRORS`.
- YAML maître: mêmes clés/ordre/séparateurs sur toutes les actions.
- Noms de fichiers: `wp_titre` (accents/espaces/`?`/`!` OK; `/ : * ? " < > |` → `-`).
- Dossiers par défaut: `NEW/...` (+ `NEW/LOGS`, `NEW/ERRORS`).
- Import WP: `maj_wp=false`. Créations locales: règles propres à chaque action.

## Actions du projet

| Action                                                    | But                             | Statut   | Version | Dernière MAJ |
| --------------------------------------------------------- | ------------------------------- | -------- | ------- | ------------ |
| [[ACTION_creer_une_note_minutes]]                         | Créer une note Minutes          | livré    | v1      | 2025-10-14   |
| [[ACTION-creer_une_note_journal]]                         | Créer une note Journal          | livré    | v1      | 2025-10-15   |
| [[ACTION-creer_mettre_a_jour_une_note_archives_du_futur]] | Créer/MAJ Archives du futur     | livré    | v1      | 2025-10-15   |
| [[ACTION-creer_mettre_a_jour_une_note_restes_du futur]]   | Créer/MAJ Restes du futur       | livré    | v1      | 2025-10-19   |
| [[ACTION-journal_recalculer_titres_depuis_post_titre_1]]  | Recalculer titres Journal       | livré    | v1      | 2025-10-19   |
| [[ACTION-importer_un_csv_de_wordpress]]                   | Import posts WP → notes         | livré    | v0      | 2025-10-22   |
| [[ACTION-modifier_une_note]]                              | Modifier une note (tags)        | livré    | v0.1    | 2025-10-19   |
| [[ACTIONS-gestion_et_mise_a_jour_des_tags_v2]]            | Sync table des tags WP→Obsidian | en cours | v3      | 2025-10-19   |


## Périmètre (In / Out)
- **In**: création/MAJ de notes (Minutes/Journal/Archives/Restes), import CSV WP, gestion des tags, YAML maître, logs.
- **Out**: publication WP directe, édition d’images, automatisations externes non décrites.

## Dépendances & interfaces
- Obsidian ≥ 1.5.0 (desktop).
- Exports WordPress (CSV tags/posts).
- Conventions docs: `ACTION_template.md`, indexes RAW.

## Roadmap v0 → v1
### ✅ Livré
- [x] v0.1 Minutes (modale, validations, YAML) — 2025-10-14
- [x] v0.2 Journal (titres, image `_WP.webp`) — 2025-10-15
- [x] v0.3 Archives P1 (`_WP.webp → _BF.webp`) — 2025-10-15
- [x] v0.4 Archives P2 + Recalcul Journal — 2025-10-15
- [x] v0.5 Restes P1/P2 (`_WP.webp → _REI.webp`) — 2025-10-15
- [x] v0.6 Tags v2 (modale, booléens YAML, logger) — 2025-10-17
- [x] v0.7 Import CSV WP consolidé (preview fiable, **WP-IMPORT**, **anti-régression**) + **Modifier une note (v0.1 tags)** — 2025-10-22

### 🔜 À venir

- [ ] v0.8 Catégories (modèle tags), paramétrage centralisé (Settings), logger commun
- [ ]  Migration progressive des actions sur `@core/*` (sans casse)
- [ ]  Panneau “Logs d’import” (historique, export .md)
- [ ]  Tests unitaires & intégration (CI locale)
- [ ]  Publication Community Plugin (manifest/versions/README/icône)
- [ ]  Internationalisation minimale (EN/FR)

## Hors scope
- Paramètres du plugin (toggles simples, valeurs par défaut).
- Tests rapides de fonctions clés; packaging release (ZIP minimal).
- Publication WordPress depuis le plugin.

## Logs

### 🗓️ 2025-10-22 — v0.7 (stabilisation import CSV WP)

> Preview fiable; écriture du bloc **WP-IMPORT**; **anti-régression** sur le nom CSV v2; logs NEW/LOGS; erreurs NEW/ERRORS.

- CSV: BOM/`sep=`/EOL normalisés; auto-détection `;`/`,`.
    
- Modale: compteurs `created/updated/errors` + `updated_identical/updated_modified`; en-tête Famille/ID; blocage si régression; warning si même ID.
    
- YAML: `WP-IMPORT` avec `wp_import_dataset_key` et `wp_import_dataset_id`.
    
- Journal: exécution `[[import-20251022-120315]]`.
    

### 🗓️ 2025-10-19 — v0.7 (édition tags, modale import)

> Ajout **Modifier une note (v0.1 tags)**; champs tags avec autocomplétion; sélecteur de dossier d’export dans la modale import.

- UI: champ de destination par liste des dossiers; défaut `NEW`.
    
- Notice fin d’import: récap `+n, −m, ×e`.
    

### 🗓️ 2025-10-17 — v0.6 (Tags v2)

> Modale toujours affichée; booléens YAML natifs; logger conditionnel (ON/OFF).

- Table des tags reconstruite et triée.
    

### 🗓️ 2025-10-15 — v0.2–v0.5 (Journal, Archives, Restes)

> Journal (titre sans heure), Archives du futur (P1/P2), Restes du futur (P1/P2), commande Recalcul Journal.

- Images `_WP.webp→_BF.webp`/`_REI.webp`; diff avec cases décochées si identiques; rename si titre change.
    

### 🗓️ 2025-10-14 — v0.1 (bootstrap & Minutes)

> Squelette plugin (esbuild); action Minutes opérationnelle; YAML maître appliqué.

- Structure `src/` posée; nommage fichier = `post_titre_full`.