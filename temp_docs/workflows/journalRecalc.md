# Workflow — Recalcul des titres d'une note Journal
_Last updated: 2025-10-24 — Plugin v0.6.0_

## Objectif
Expliquer l'action `registerJournalRecalcCommand()` (`src/actions/journalRecalc.ts`) qui ajoute la commande palette « Journal → Recalculer titres depuis post_titre_1 » afin de synchroniser les titres, liens et nom de fichier d'un Journal Photo à partir de `post_titre_1`.

## Résumé exécutif
1. **Validation de la note active** : s'assurer qu'une note Journal Photo est ouverte (frontmatter présent, catégorie correcte).
2. **Contrôles des champs clés** : vérifier la présence de `post_titre_1` et `post_date`.
3. **Recalculs** : dériver `post_titre_2`, `post_titre_full`, `img_alt`, `img_legende`, `lien_archives`, `lien_restes` à partir de `post_titre_1` et `post_date`.
4. **Patch YAML** : appliquer les mises à jour via `applyYamlPatch()` pour conserver la structure existante.
5. **Renommage du fichier** : renommer la note si son nom ne correspond pas au nouveau `post_titre_full`.
6. **Notifications** : informer l'utilisateur du succès ou des erreurs.

## Pré-requis
- Note active avec frontmatter YAML standard.
- `post_date` convertible en date (utilisé par `formatDateToFrenchDayOnly`).
- Services `dateUtils`, `titleUtils`, `journalUtils`, `yamlPatch`, `archivesUtils` disponibles.

## Entrées & sorties principales
| Élément | Description |
| --- | --- |
| `plugin` | Instance du plugin (utilisée pour accéder à `app` et `addCommand`). |
| Note Journal active | Source des métadonnées. |
| Retour | Aucun (effets : mise à jour YAML + renommage éventuel). |

## Déroulé détaillé
1. **Sélection du fichier** : `app.workspace.getActiveFile()` doit retourner un `TFile`; sinon notice « Aucun fichier actif ».
2. **Lecture du frontmatter** : `getFrontmatter(app, file)` récupère les champs et filtre `position`.
3. **Vérification de la catégorie** : `isJournalPhotoCategory(fm.post_cat)` doit être vraie.
4. **Contrôle des champs** :
   - `post_titre_1` non vide ; sinon notice.
   - `post_date` non vide ; sinon notice.
5. **Calculs** :
   - `formatDateToFrenchDayOnly(post_date, true)` → libellé sans heure.
   - `post_titre_2 = "Journal du <jour>"`.
   - `post_titre_full = buildFullTitle(post_titre_1, post_titre_2)`.
   - Liens : `buildArchivesLinkTitle(post_titre_full)`, `buildRestesLinkTitle(post_titre_full)`.
   - Image : `img_alt = post_titre_1`, `img_legende = post_titre_full`.
6. **Patch du contenu** :
   - Lecture complète `vault.read(file)`.
   - `applyYamlPatch(content, updates)` applique les paires clé/valeur sans réécrire l'ordre.
   - Si le contenu n'a pas changé, ne pas réécrire.
7. **Renommage** : comparer `basenameNoExt(file.name)` avec `post_titre_full`; renommer si différent.
8. **Notices** :
   - Succès avec renommage → « Journal mis à jour + renommage ».
   - Succès sans renommage → « Journal mis à jour ».
   - `catch` global → log console + notice d'erreur.

## Articulation avec la couche UI
- Commande palette accessible via la catégorie « Journal ».
- Notice immédiate pour signaler l'absence de note active, de frontmatter ou de champs obligatoires.
- Aucune modale : l'action est instantanée une fois les validations passées.

## Points de vigilance
- Le format de `post_date` doit être compatible avec `Date` → sinon `formatDateToFrenchDayOnly` retourne vide et l'action s'arrête.
- La commande renomme physiquement le fichier : vérifier l'absence de conflit de nom (géré par Obsidian mais peut entraîner un avertissement utilisateur).
- `applyYamlPatch` repose sur la détection de clés existantes ; si le YAML est fortement personnalisé, certaines clés peuvent ne pas être trouvées (mais sont ajoutées si absentes selon l'implémentation du patch).

## Extensions possibles
- Ajout d'une option pour prévisualiser les changements avant application.
- Recalcul automatique de `tags` ou d'autres métadonnées dépendantes.
- Possibilité de mettre à jour en lot plusieurs notes Journal sélectionnées.
