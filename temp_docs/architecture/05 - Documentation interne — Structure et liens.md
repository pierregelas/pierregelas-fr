# Documentation interne — Structure et liens
_Last updated: 2025-10-24 — Plugin v0.6.0_

## Objectif
Centraliser les points d’entrée de la documentation interne du plugin `pierregelas-fr`, afin de faciliter :
- la lecture rapide de l’architecture du code,
- le suivi des flux et scénarios,
- la maintenance et la vérification par Codex,
- l’onboarding de nouveaux contributeurs.

## Structure du dossier `temp_docs/`

temp_docs/  
├─ architecture/  
│ ├─ 01 - Structure du plugin (vue par dossier).md  
│ ├─ 02 - Flux fonctionnels du plugin.md  
│ ├─ 03 - Points d’attention et spécificités techniques.md  
│ ├─ 04 - Annexes (types et interfaces).md  
│ └─ 05 - Documentation interne — Structure et liens.md  




## Fonction des sous-dossiers

### architecture/
- Vue complète du code (dossiers, flux, types, contraintes).
- Sert de référence principale pour Codex lors des audits de cohérence.


## Bonnes pratiques de maintenance

### 1. Versionnement
- Chaque document interne doit indiquer :

```
_Last updated: YYYY-MM-DD — Plugin vX.Y.Z_
```

- À chaque refactor, mettre à jour :
- les fichiers architecture/
- les workflows impactés
- la date/version dans le README public

### 2. Lien avec Codex
- Codex se base sur :
- **01 - Structure du plugin**
- **02 - Flux fonctionnels**
- **03 - Points d’attention**
- Ces fichiers servent de source de vérité pour les vérifications automatiques.
- Lors d’une divergence détectée par Codex, mettre à jour ces fichiers avant de modifier le code.

### 3. Lien avec le README public
- Ajouter dans le README (section « Documentation interne ») :
	- Voir temp_docs/architecture/ pour l’architecture détaillée et les flux internes.
        - Pointer également vers modals-README, services-README et workflows/ pour guider les contributeurs selon leurs besoins.

### 4. Exemples et ressources
- YAML et journaux : réutiliser les extraits du README public.
- Captures d’écran de la modale (prévisualisation CSV) à ajouter dans `workflows/`.
- CSV d’essai : stocker avec les workflows (ex. `temp_docs/workflows/demo-data/`).

### 5. Cycle de mise à jour
1. Avant release → vérifier que tous les fichiers `temp_docs/` sont alignés avec le code.
2. Après merge ou refactor → ajouter une note “Mis à jour selon commit X”.
3. Lors d’un audit Codex → synchroniser le retour Codex et ces fichiers.

## Références croisées
- `README.md` → lien vers `temp_docs/architecture/`.
- `pierregelas-fr-docs` → documentation publique.
- `src/core/types.ts` → définition des types utilisés dans les annexes.
- `src/actions/importWordpress.ts` → logique d’import principale.

---


