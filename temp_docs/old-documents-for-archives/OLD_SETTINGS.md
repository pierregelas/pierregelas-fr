---
doc_id: plugin_settings
titre: SETTINGS — Paramètres du plugin
type_doc: settings
version: v1
version_precedente: none
date_maj: 2025-10-17
etat: courant
notes: "Synthèse des paramètres du plugin, ajout du toggle de logs (ON/OFF)."
---

# SETTINGS — Paramètres du plugin

## Infos synthétiques
- **Où ?** Paramètres → **pierregelas.fr** → *Écrire des logs d’actions* (toggle).
- **Ce que ça fait ?** Active/désactive l’écriture de fichiers de log Markdown par exécution d’action.
- **Où sont écrits les logs ?** `wp_tags/logs_tests/` (si activé). Sauvegardes de table: `wp_tags/backup/`.
- **Impact fonctionnel ?** Quand OFF, aucune création de log; les actions continuent à fonctionner normalement.
- **Contexte actuel ?** Utilisé par l’action **Tags v2 (WP→Obsidian)**; prévu pour être mutualisé aux autres actions plus tard.

## YAML de configuration (par défaut)
```yaml
settings:
  loggingEnabled: true
```

## Roadmap (liée aux settings)
### ✅ Livré
- **2025-10-17 : Onglet Paramètres + toggle logs (ON/OFF)**  
    Ajout d’un onglet **pierregelas.fr** avec le paramètre *Écrire des logs d’actions* (activé par défaut).

### 🔜 À venir
- **Sélecteur de CSV** dans l’action Tags (permettre de choisir un fichier précis au lieu du “dernier”).
- **Niveaux de verbosité du logger** (normal/minimal) pour des logs plus compacts si souhaité.
- **Rotation des logs** (conserver les *N* derniers fichiers, ex. 30).

## Logs (liés aux settings)
- **2025-10-17 10:52** — Ajout du **toggle de logs** (ON/OFF) et de l’onglet Paramètres. Intégration côté **Tags v2** (logger conditionnel).
- **2025-10-17 11:05** — Correction du **dump YAML typé**: les booléens sont écrits sans guillemets (`wp_update: true|false`).

> Encadré (hors-scope, à noter)
> - Accès rapide pour ouvrir le dossier des logs depuis l’onglet Paramètres.
> - Option *“log minimal”* (n’écrire que l’essentiel: résumé + compteurs).
> - Option *“log complet”* (entrées/diff/sorties détaillées) — déjà l’état actuel quand activé.
