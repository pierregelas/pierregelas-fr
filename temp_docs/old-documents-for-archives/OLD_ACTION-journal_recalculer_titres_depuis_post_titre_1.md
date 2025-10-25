---
doc_id: action_journal_recalc_from_titre1
rAwUrl: https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/ACTION-journal_recalculer_titres_depuis_post_titre_1.md
titre_palette: "Journal → Recalculer titres depuis post_titre_1"
type_doc: action
version: v1
date_maj: 2025-10-19
etat: courant
---

# ACTION — Journal → Recalculer titres depuis post_titre_1

## tl,dr
- Recalcule toutes les **dérivations Journal** à partir de `post_titre_1` et `post_date` (`post_titre_2`, `post_titre_full`, `img_alt`, `img_legende`, `lien_archives`, `lien_restes`).
- Met à jour **uniquement le YAML in-place** (préserve l’ordre et les séparateurs), puis **renomme la note** si son nom ≠ `post_titre_full`.
- À exécuter **avant** les actions **P2** (*Archives du futur* / *Restes du futur*) lorsqu’on a modifié `post_titre_1`.
- **Corps non modifié**; champs non couverts laissés intacts (`tags`, `post_descr`, `post_extrait`, `post_id`, `post_mod`, `post_perma`, `post_vid_url`, `wp_*`). :contentReference[oaicite:1]{index=1}

## Description
*(Contenu libre — à insérer par l’auteur. Cette section est la source de vérité et ne doit jamais être modifiée automatiquement.)*

## Roadmap v0 → v1
### ✅ Livré
- [x] Commande “Recalculer titres depuis post_titre_1” — 2025-10-15
- [x] Images: `img_alt = post_titre_1`, `img_legende = post_titre_full` — 2025-10-15
- [x] Dérivations: `post_titre_2` (**Journal du jour**), `post_titre_full = post_titre_1 + " " + post_titre_2` — 2025-10-15
- [x] Liens: `lien_archives` et `lien_restes` reconstruits depuis `post_titre_full` (wikilinks) — 2025-10-15
- [x] **Renommage** automatique si nécessaire (nouveau nom = `post_titre_full`) — 2025-10-15
## Roadmap v1 → v2
### ✅ Livré
- [x] Mise au gabarit **ACTION_template.md** (frontmatter, tl,dr, roadmaps, logs) — 2025-10-19
### 🔜 À venir
- [ ] **Preview (dry-run)**: lister ce qui va changer (titres/liens) avant d’appliquer
- [ ] **Journal** des champs modifiés (avant/après, troncature maîtrisée)
- [ ] Paramètres de l’action (désactiver renommage, strict Windows, style de liens)
### 🧪 À évaluer
- [ ] Batch: appliquer le recalcul à une **sélection de notes Journal**
- [ ] Zones protégées pour éviter d’écraser un YAML commenté/annoté manuellement
- [ ] Tests unitaires: dérivations date/titres, renommage, idempotence
### ❌ Rejeté
- [ ] Modification du **corps** de note (hors scope de cette action)

## Hors scope
- [DX] Exposer des **raccourcis**: recalcul direct depuis le **panneau de propriétés**
- [UX] Indication visuelle post-action (“titres recalculés”, “renommage effectué”)
- [Interop] Hook optionnel après renommage pour **mettre à jour les backlinks**
- [Perf] Cache temporaire du parsing YAML pour séries de recalculs

## Logs
### 🗓️ 2025-10-19 — Mise au gabarit et clarifications
> Alignement du document sur le template commun; rappel des champs recalculés, du périmètre YAML-only, et du renommage conditionnel.
- Dérivations confirmées: `post_titre_2`, `post_titre_full`, `img_alt`, `img_legende`, `lien_archives`, `lien_restes`
- Portée: **YAML uniquement** (ordre et séparateurs conservés), **corps non modifié**
- Renommage: appliqué si le nom de fichier ≠ `post_titre_full`

### 🗓️ 2025-10-15 — Commande ajoutée
> Création de la commande utilitaire **Journal → Recalculer titres depuis post_titre_1**.
- Recalcule titres (`post_titre_2`, `post_titre_full`)
- Met à jour image (`img_alt`, `img_legende`)
- Reconstruit liens (`lien_archives`, `lien_restes`)
- Renomme la note si nécessaire (nom = `post_titre_full`) :contentReference[oaicite:2]{index=2}
