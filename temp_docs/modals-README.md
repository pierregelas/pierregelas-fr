# Modales du dossier `src/modals`
_Last updated: 2025-10-24 — Plugin v0.6.0_

Cette fiche recense toutes les modales fournies par le plugin. Pour chaque module, elle décrit les types publics, le flux utilisateur géré et les actions qui invoquent la modale. L'ordre suit l'alphabet des fichiers.

## `archivesDiffModal.ts`
- **Types `DiffValue`, `DiffGroup`, `DiffItem`, `DiffModel`, `DiffResult`** : encapsulent la structure complète d'une diff Archives/Restes (valeurs YAML avant/après, regroupement A/B, renommage proposé et résultat retourné).【F:src/modals/archivesDiffModal.ts†L8-L37】
- **`openArchivesDiffModal(app, model)`** : instancie `ArchivesDiffModal`, pré-coche chaque item selon `checked`, affiche deux sections (champs communs A, dérivés B), propose un champ texte + toggle pour renommer la note cible, puis renvoie les clés sélectionnées et, si activé, le nouveau nom de fichier ; `null` signifie annulation.【F:src/modals/archivesDiffModal.ts†L39-L160】
- **Appels** : les actions de mise à jour `createArchives` et `createRestes` bâtissent les `DiffItem[]`, déclenchent la modale, puis appliquent les champs choisis et un éventuel renommage sur la note cible.【F:src/actions/createArchives.ts†L217-L359】【F:src/actions/createRestes.ts†L214-L359】

## `simpleInfoModal.ts`
- **`openInfoModal(app, title, message, buttonText?)`** : ouvre une modale éphémère affichant un message et un unique bouton (personnalisable) ; la promesse est résolue à la fermeture pour simplifier l'enchaînement dans les actions.【F:src/modals/simpleInfoModal.ts†L1-L27】
- **Appels** : utilisée comme feedback bloquant dans les actions Tags (CSV invalide, fichier manquant, erreurs d'E/S) ainsi que lors des synchronisations Archives/Restes lorsque la note cible est déjà alignée sur le Journal.【F:src/actions/tags.ts†L70-L208】【F:src/actions/createArchives.ts†L200-L214】【F:src/actions/createRestes.ts†L200-L210】

## `tagsDiffModal.ts`
- **Types `TagsDiffModel` et `TagsDiffResult`** : décrivent l'entrée (items de diff, titre optionnel, nom du CSV) et la sortie (clés actionnables retenues) de la modale de diff Tags.【F:src/modals/tagsDiffModal.ts†L11-L21】
- **`openTagsDiffModal(app, model)`** : instancie la classe interne `TagsDiffModal`, regroupe les items par `DiffKind`, affiche sept sections avec libellés français, autorise le toggling uniquement pour les groupes actionnables et renvoie les clés cochées ; `null` signifie annulation.【F:src/modals/tagsDiffModal.ts†L23-L210】
- **Appels** : la commande `updateTagsFromLastCsv` affiche systématiquement cette modale pour valider la diff issue de `buildTagsDiff`, qu'il y ait ou non des mises à jour actionnables.【F:src/actions/tags.ts†L135-L213】

## `tagsSelectModal.ts`
- **`TagsSelectOptions`** : paramètre la modale de sélection (slugs autorisés, tags initiaux, message de désactivation, libellés personnalisés). L'initialisation nettoie et déduplique `allowed` et `initial` pour garantir un état cohérent.【F:src/modals/tagsSelectModal.ts†L13-L61】
- **`class TagsSelectModal`** : gère l'expérience de sélection multi-tags : ouverture via `openAndGetSelection()`, autocomplétion fuzzy filtrée, chips supprimables qui préservent l'ordre, ajout par Entrée ou clic, et fermeture qui renvoie soit la liste canonique finale, soit `null` en cas d'annulation.【F:src/modals/tagsSelectModal.ts†L63-L211】
- **Utilisation** : la commande `modifyNote` construit la modale avec les slugs autorisés extraits de la table Tags, attend `openAndGetSelection()` puis applique la liste retournée sur le YAML cible via `patchTagsAndMaj`.【F:src/actions/modifyNote.ts†L90-L130】【F:src/actions/modifyNote.ts†L115-L151】
