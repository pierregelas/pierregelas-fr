# AGENTS.md (src/)

Ce fichier décrit les conventions internes du code source du plugin Obsidian `pierregelas-fr`.

## 📁 Rôles des dossiers

- `actions/` : contient les actions déclenchées par l’utilisateur (ex: création de notes)
- `core/` : fonctions pures (parseurs CSV, builders YAML, typage)
- `services/` : lecture / écriture avec le système de fichiers d’Obsidian

## 🔄 Pipeline logique

UI → Action → Core → Service

- Une action (`create*.ts`) assemble les données en appelant `prepareXxxInput()`
- Elle génère un YAML via `buildXxxYaml()` (dans `yamlMaster.ts`)
- Le fichier final est écrit avec les helpers de `src/services/`

## 🧩 YAML Builders

Tous les YAML sont générés via :

- `buildRestesYaml()`
- `buildArchivesYaml()`
- `buildJournalYaml()`
- `buildMinutesYaml()`

## 🛠️ Helpers de préparation

Chaque action a son helper `prepareXxxInput()` pour transformer les données fournies par l’utilisateur en structure d’entrée normalisée.
