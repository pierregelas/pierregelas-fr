# Annexes — Types et interfaces
_Last updated: 2025-10-24 — Plugin v0.6.0_

## Interfaces principales

### ImportErrorRecord
Structure d’une erreur d’import, collectée en mémoire pendant la boucle d’import (non relue depuis disque).

```ts
export interface ImportErrorRecord {
  wp_error: string;
  post_id: string;
  wp_row_index: number;
  wp_id_raw: string;
  wp_titre_raw: string;
  error_type: string;
  errorFileWikilink: string;
}
```

### ImportSummary

Structure renvoyée par l’action `importWordpress.ts`, transmise à la couche UI pour générer le journal Markdown.

```ts
export interface ImportSummary {
  created: number;
  updated: number;
  errors: number;
  created_paths?: string[];
  updated_identical_paths?: string[];
  updated_modified_paths?: string[];
  error_paths?: string[];
  updated_modified_details?: { path: string; fields: string[] }[];
  error_records?: ImportErrorRecord[];
}

```

## Types secondaires utilisés dans les actions

```ts
export interface WpRow {
  wp_id: string;
  wp_titre: string;
  wp_date: string;
  wp_categories: string[];
  wp_status: string;
  wp_type: string;
  wp_extrait?: string;
  wp_img?: string[];
}

export interface MasterFields {
  post_id: string;
  post_titre_full: string;
  post_date: string;
  post_status: string;
  wp_categories: string[];
  wp_tags?: string[];
}
```

## Flux de propagation des types

- **ImportErrorRecord** : défini dans `core/types.ts`, rempli dans `actions/importWordpress.ts`, consommé par `ui/commands.ts` (journal).
    
- **ImportSummary** : type de retour de l’action d’import, enrichi dans `actions/importWordpress.ts` avec les chemins et compteurs, puis utilisé par la fonction `writeImportLog()` dans la couche UI.
    
- **WpRow / MasterFields** : structures internes au parsing et mapping WordPress.
    

## Bonnes pratiques

- Ne jamais renommer ou retirer de champs d’un type sans synchroniser les modules concernés (`actions`, `ui`, `core/types.ts`).
    
- Les valeurs manquantes doivent être sérialisées en chaînes vides `""` dans le log pour éviter les `undefined`.
    
- Ajouter les nouveaux champs d’erreur en fin d’interface pour maintenir la compatibilité descendante.
    
- Utiliser systématiquement les types importés depuis `@core/types` (aucune redéfinition locale).
    

## Références croisées

- `src/core/types.ts` : définition des interfaces.
    
- `src/actions/importWordpress.ts` : implémentation et remplissage des structures.
    
- `src/ui/commands.ts` : utilisation pour sérialiser le log.
    
- `temp_docs/architecture/01 - Structure du plugin (vue par dossier).md` : contexte des fichiers concernés.
    
- `temp_docs/architecture/02 - Flux fonctionnels du plugin.md` : parcours complet des données.

