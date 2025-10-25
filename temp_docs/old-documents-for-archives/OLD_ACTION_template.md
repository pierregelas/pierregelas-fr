---
doc_id: action_<slug>
rAwUrl: https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/ACTION_template.md
titre_palette: "<Titre affiché dans la palette>"
type_doc: action
version: v0
date_maj: YYYY-MM-DD
etat: courant
---


> [!success] titre Frontmatter YAML — Ce qu’il faut faire
> - Bloc **multi-lignes** délimité par `---` **en tout début de fichier**.
> - **Clés exactes** et **ordre** identique au template.
> - `doc_id`: slug stable minuscule sans accents/espaces (ex. `action_importer_csv_wp`).
> - `rAwUrl`: URL **raw GitHub** du document.
> - `titre_palette`: intitulé affiché dans la **palette de commandes**.
> - `type_doc`: toujours `action`.
> - `version`: `v0`, `v1`, etc.
> - `date_maj`: `YYYY-MM-DD`.
> - `etat`: `courant` (ou `archive`).
> 
> ```yaml
> ---
> doc_id: action_<slug>
> rAwUrl: https://raw.githubusercontent.com/pierregelas/pierregelas-fr-docs/refs/heads/main/ACTION-<slug>.md
> titre_palette: "<Titre affiché dans la palette>"
> type_doc: action
> version: v0
> date_maj: 2025-10-19
> etat: courant
> ---
> ```



> [!failure] titre Frontmatter YAML — Ce qu’il ne faut pas faire
> - Frontmatter **sur une seule ligne** ou **sans** délimiteurs `---`.
> ```yaml
> --- doc_id: Action Importer CSV WP; rawUrl: http://github...  titrePalette: Importer CSV  version: 1  date_maj: "hier"  state: current ---
> ```
>     
> - Clés **mal orthographiées** ou **non conformes** (`rawUrl`, `titrePalette`, `state`).
>     
> - `doc_id` avec **espaces/accents** (`Action Importer`), ou qui **change** selon le titre.
>     
> - URL **non raw** ou **qui pointe ailleurs** que ce fichier.
>     
> - `version` **sans** `v` (ex. `1`) ou formats ambigus.
>     
> - `date_maj` **relative** (`"hier"`, `"aujourd’hui"`) ou au mauvais format.
>     
> - `etat` avec une valeur inventée (`current`) au lieu de `courant` / `archive`.

# ACTION — <Titre lisible de l’action>

## tl,dr
- <objectif de l’action en 1 phrase>
- <état d’avancement — livré / à venir>
- <points d’attention majeurs>


> [!INFO] **But — section `## tl,dr`**  
> Résumer en 3–5 points l’objectif de l’action, l’état d’avancement et les points d’attention clés. Le lecteur doit comprendre “quoi / où ça en est / quoi surveiller” en 10 secondes.

> [!INFO] **Qui intervient**
> 
> - **Assistant**: rédige et met à jour le tl,dr à chaque évolution significative (fonction livrée, règle modifiée, périmètre ajusté).
>     
> - **Auteur**: relit, corrige le fond si nécessaire (précisions métier), signale les oublis ou ambiguïtés.
>     

> [!INFO] **Automatisme**
> 
> - Après toute modification de **Description** ou de **Roadmap**, l’assistant propose une mise à jour du tl,dr.
>     
> - Lors d’un changement de **version** (vX → vY), l’assistant reformule le tl,dr pour refléter la nouvelle “photo” du périmètre.
>     

> [!INFO] **Périodicité**
> 
> - **Immédiat**: dès qu’un item passe de “À venir” à “Livré”, ou lorsqu’une règle centrale change.
>     
> - **Minimum**: à chaque **bump de version** et en fin de **journée de travail** s’il y a eu plusieurs micro-changements.
>     

> [!INFO] **Bonnes pratiques**
> 
> - 3–5 puces maximum, phrases courtes, verbes d’action.
>     
> - Zéro jargon; refléter strictement **Description** + **Roadmap** (pas d’info nouvelle).
>     
> - Mentionner règles maîtres (sources de vérité, erreurs), comportements visibles (preview, journal), valeurs par défaut majeures.
>     
> - Utiliser des dates **absolues** (AAAA-MM-JJ), pas de relatifs (“hier”).
>     
> - Garder une voix homogène entre actions; ordre logique stable: objectif → fonctionnement → livré/à venir → points d’attention.
>

> [!success] titre tl,dr — Ce qu’il faut faire  
> **Exemple (3–5 puces, concises)**
> 
> - Importe un CSV WP → crée/MAJ des notes `.md` dans **NEW** (dossier choisissable).
>     
> - Règles maîtres: `post_titre_full = wp_titre`, `post_id = wp_id`, `maj_wp = false`.
>     
> - Corps auto: **Vignette** → **Vidéo** → **Notes** (selon dispo).
>     
> - Preview (dry-run) + journal **NEW/LOGS**; erreurs en **NEW/ERRORS**; compteur **créés/MAJ/erreurs**.
>     
> - État au **2025-10-19**: MAJ **identiques/modifiées** différenciées dans la modale et le log.
>     
> 
> **Rappels**
> 
> - 3–5 puces max, **sans ligne vide** entre les items.
>     
> - Verbes d’action, **zéro jargon**, infos factuelles (pas d’intentions).
>     
> - **Dates absolues** `YYYY-MM-DD`; refléter **Description + Roadmap**.


> [!failure] titre tl,dr — Ce qu’il ne faut pas faire  
> Un paragraphe long qui raconte tout le contexte, mélange objectifs, décisions futures et idées non validées, avec des dates relatives (“hier”, “récemment”) et des promesses vagues (“bientôt on fera…”). Utiliser des listes à rallonge, des sauts de ligne entre chaque puce, ou introduire des détails techniques non pertinents ici.
> 

## Description

> [!success] titre Description — Ce qu’il faut faire
> 
> - Texte **source** du projet : précis, exhaustif, **autorité de référence** (règles métiers, formats, exemples).
>     
> - Structurer avec des sous-sections **`###`** / **`####`** : _Contexte_, _Règles_, _Exemples_, _Cas limites_, _Erreurs fréquentes_.
> - Dates **absolues** (`YYYY-MM-DD`), terminologie **stable** (mêmes noms de champs que dans le code et les autres docs).
>     
> - Liens internes en **wikilinks** `[[...]]` vers les actions ou specs concernées; liens externes si nécessaire.
>     
> - **Aucune intervention automatique** sur le contenu : jamais résumé, réordonné, “nettoyé” ni modifié sans demande explicite.
>


> [!failure] titre Description — Ce qu’il ne faut pas faire
> 
> - Mettre des **TODO**, des **checkboxes** ou des items de **roadmap** (ces contenus vont dans _Roadmap_ ou _Logs_).
>     
> - Employer des **dates relatives** (“hier”, “récemment”), des termes flous (“bientôt”, “à voir”).
>     
> - Modifier/réécrire des extraits “pour faire joli” (ex.: reformuler un YAML d’exemple).
>     
> - Coller des **pages de logs**, du _diff_ ou des sorties d’outils : trop verbeux, non pérenne.
>     
> - Mélanger des décisions non validées avec les règles sources (les hypothèses vont dans _Hors scope_ / _À évaluer_).
>     
> - Introduire des noms de champs **incohérents** (variantes, casse différente) ou des formats ambigus.


## Roadmap v0 → v1

> [!INFO] **But — sections `## Roadmap v0 → v1` et `## Roadmap vX → vY`**  
> Donner la **photo du travail** entre deux versions : ce qui a été **livré**, ce qui est **planifié** et ce qui est **à étudier** ou **rejeté**.
> 
> - `v0 → v1` = **phase d’amorçage** (historique de la mise sur rails).
>     
> - `vX → vY` = **itération courante** (pilotage quotidien).
>     

> [!INFO] **Qui intervient**
> 
> - **Assistant**: propose le classement (déplacement des items), maintient la cohérence et la forme.
>     
> - **Auteur**: **valide les priorités**, tranche les arbitrages (promouvoir/retirer), rédige le fond si besoin.
>     

> [!INFO] **Automatisme**
> 
> - Quand un item passe en production (fonction prête, doc alignée) ⇒ **déplacer** de “🔜 À venir” vers “✅ Livré” et **dater** l’item.
>     
> - Si une idée “🧪 À évaluer” est acceptée ⇒ **promouvoir** vers “🔜 À venir”.
>     
> - Si une idée est écartée ⇒ **déplacer** vers “❌ Rejeté” en ajoutant une **raison courte**.
>     
> - Après tout mouvement significatif ⇒ **mettre à jour le `## tl,dr`** pour refléter l’état.
>     
> - `v0 → v1` est **figée** une fois v1 publiée (on n’y ajoute plus d’items après coup).
>     

> [!INFO] **Périodicité**
> 
> - **À chaque** livraison ou rollback.
>     
> - **Fin de session/journée** si plusieurs micro-changements.
>     
> - **Avant bump de version** (release): nettoyage final + datation.
>     
> - **Hebdo**: petit grooming (promotions/déclassements, clarté des intitulés).
>     

> [!success] titre **Roadmap v0 → v1 — Ce qu’il faut faire**  
> **Exemple (uniquement “✅ Livré”, items datés, verbes d’action)**
> - Un seul sous-bloc **✅ Livré** (historique d’amorçage).
>     
> - **Chaque item** en **checkbox** avec **verbe d’action** + **date** `YYYY-MM-DD`.
>     
> - **Aucune ligne vide** entre deux items.
>

```
## Roadmap v0 → v1
### ✅ Livré
- [x] Initialiser la commande et les validations — 2025-10-15
- [x] Générer le YAML maître et le corps de note — 2025-10-15
- [x] Définir le nommage des fichiers et liens — 2025-10-15

```

> [!failure] titre **Roadmap v0 → v1 — Ce qu’il ne faut pas faire**
> - Mauvais libellé de section (**“✅ Fait”** au lieu de **“✅ Livré”**).
>     
> - Dates **relatives** (“hier”).
>     
> - Mélange d’autres sous-sections (**“À venir”**) dans `v0 → v1`.
>     
> - Items **non cochés** en “Livré” et absence de **date**.
>     
> - Lignes **vides** entre items; astérisques `*` au lieu de `- [ ]`.

```
## Roadmap v0 → v1
### ✅ Fait
* Créer la commande (hier)

### À venir
- [ ] Prévisualisation

- [x] YAML ok

```

> [!success] titre **Roadmap vX → vY — Ce qu’il faut faire**  
> **Exemple (quatre sous-sections, forme homogène)**
> - **Quatre** sous-sections fixes : **✅ Livré**, **🔜 À venir**, **🧪 À évaluer**, **❌ Rejeté**.
>     
> - En **“✅ Livré”** : items **cochés** + **date** `YYYY-MM-DD`.
>     
> - En **“🔜/🧪/❌”** : items **non cochés**, **sans date**.
>     
> - **Aucune ligne vide** entre items d’une même liste.
>     
> - **Pas de doublon** : un item **se déplace** (🧪 → 🔜 → ✅ ou ❌).

> [!failure] titre **Roadmap vX → vY — Ce qu’il ne faut pas faire**
> - Item **non coché** en “✅ Livré” ou **coché** en “À venir”.
>     
> - Date au **mauvais format** (“19/10”) ou **manquante** en “Livré”.
>     
> - Sous-section **non standard** (“À discuter”) au lieu de **🧪 À évaluer**.
>     
> - Items **redondants** entre sections; descriptions **trop longues**.
>     
> - Lignes **vides** entre items; non-respect des libellés et de l’iconographie.

```
## Roadmap v1 → v2
### ✅ Livré
- [ ] Prévisualisation (ok)
- Feature super longue avec plusieurs phrases et détails techniques inutiles

### À venir
- [ ] Exposer Settings — 19/10
- [x] Normaliser headers

### À discuter
- [ ] Faire des trucs

```
### ✅ Livré
- [x] <item livré 1 — YYYY-MM-DD>
- [x] <item livré 2 — YYYY-MM-DD>

## Roadmap vX → vY
### ✅ Livré
- [x] <item livré 1 — YYYY-MM-DD>
- [x] <item livré 2 — YYYY-MM-DD>
### 🔜 À venir
- [ ] <item acté à livrer 1>
- [ ] <item acté à livrer 2>
### 🧪 À évaluer
- [ ] <piste à étudier 1>
- [ ] <piste à étudier 2>
### ❌ Rejeté
- [ ] <idée rejetée 1 — raison courte>
- [ ] <idée rejetée 2 — raison courte>

## Hors scope
- <idée parking 1 (non prévue au périmètre actuel)>
- <idée parking 2>

> [!INFO] **But — section `## Hors scope`**  
> Rassembler les **idées en dehors du périmètre courant**: pistes, envies, notes à garder “au frais” sans polluer la Roadmap. Ce n’est **ni un engagement**, ni un backlog officiel; c’est un **parking d’idées** prêt à alimenter la planification.

> [!INFO] **Qui intervient**
> 
> - **Assistant**: capte et reformule les idées issues des échanges; dédoublonne; relie à d’autres actions si pertinent.
>     
> - **Auteur**: arbitre; transforme une idée “parking” en tâche Roadmap (ou la rejette); apporte le contexte métier.
>     

> [!INFO] **Automatisme**
> 
> - À chaque idée formulée en conversation, l’assistant la **copie** dans `## Hors scope` avec une **phrase actionnable**.
>     
> - Si l’idée est validée, l’assistant la **déplace** vers `### 🧪 À évaluer` (ou directement `### 🔜 À venir`) de la Roadmap **de l’action concernée**.
>     
> - Si l’idée est écartée, l’assistant la **déplace** vers `### ❌ Rejeté` avec une **raison courte**.
>     

> [!INFO] **Périodicité**
> 
> - **Continu**: ajout immédiat des idées citées en conversation.
>     
> - **Hebdo**: mini-tri (regrouper, retirer les doublons, clarifier les intitulés).
>     
> - **Avant bump de version**: revue rapide pour promouvoir ou rejeter ce qui est mûr.
>     

> [!INFO] **Bonnes pratiques**
> 
> - **Une idée = une puce**; intitulé **verbe d’action** (“Explorer…”, “Étudier…”, “Prototyper…”).
>     
> - **Pas de cases à cocher** ici; pas de dates de livraison; pas de sous-sujets techniques profonds.
>     
> - Ajouter si utile: un **mot-clé** en tête `[UX]`, `[Perf]`, `[DX]`, `[Interop]`.
>     
> - Ajouter un **wikilink** vers l’action/doc liée si l’idée touche un autre périmètre.
>     
> - Lors de la promotion en Roadmap, **ne pas dupliquer**: l’idée **quitte** `Hors scope` pour vivre dans la bonne section.
>

> [!success] titre Hors scope — Ce qu’il faut faire
> 
> - Une idée **par puce**, courte, avec **verbe d’action**: “Explorer…”, “Étudier…”, “Prototyper…”.
>     
> - Pas d’engagement ni d’échéance: c’est un **parking d’idées**, pas un plan.
>     
> - Tags facultatifs pour classer: **[UX]**, **[Perf]**, **[DX]**, **[Interop]**.
>     
> - Ajouter un **wikilink** si l’idée touche une autre action: `[[ACTION-importer_un_csv_de_wordpress]]`.
>     
> - **Exemples**
>     
> - [UX] Explorer une preview compacte des diffs dans la modale
>     
> - [DX] Prototyper un script pour lister les fichiers orphelins
>     
> - [Interop] Étudier un import JSON alternatif (lecture incrémentale)
>     

> [!failure] titre Hors scope — Ce qu’il ne faut pas faire
> 
> - **Checkboxes** (ça engage): `- [ ] Faire la preview la semaine prochaine`
>     
> - **Dates/échéances**: `- Étudier Settings (2025-11-01)`
>     
> - **Pavés** multi-phrases avec détails techniques; préférer une **puce** brève.
>     
> - **Doublons** ou copies d’items déjà en Roadmap; on **ne duplique pas**.
>     
> - **Décisions** ici (“Validé”, “Rejeté”) — ces statuts vont dans la Roadmap (`🔜/✅/❌`).
>

## Logs

> [!success] titre Logs — Ce qu’il faut faire
> **Exemple conforme (titre + résumé profane + liste exhaustive)**
> 
> ### 🗓️ 2025-10-15 — Processus 2 (mise à jour Restes du futur)
> > Mise à jour automatique des notes “Restes du futur” à partir des journaux : on vérifie la date et les tags, on recopie les infos depuis la note Journal si le titre a changé, sinon on confirme que tout est déjà à jour.
> - Résolution: via `lien_restes` ou fallback par `post_date` + `post_cat` contient `restes-du-futur`.
> - Diff (A): `post_date`, `tags` (cases cochées **seulement** si différents).
> - Diff (B), si le titre Journal a changé: `post_titre_1/2/full` (mot-clé **Restes**), `img_filename` **(_REI_)** + `cover`, `img_alt`, `img_legende`, `lien_journal`, `lien_archives` (copié depuis Journal); cases cochées **seulement** si différents.
> - Rename: proposé si `post_titre_full` change (nom de fichier = nouveau titre).
> - Zéro différence: modale d’information « La note “Restes du futur” est parfaitement à jour ! ».
> 
> **Rappels**
> - Un **seul bloc** par événement (autosuffisant).
> - **Blockquote** juste sous le titre, en langage simple (pas de jargon).
> - Champs en **code** (`` `post_titre_full` ``) ; marqueurs en **gras** (**_REI_**, **Restes**).
> - **Dates absolues** `YYYY-MM-DD`; **aucune ligne vide** entre puces.

> [!failure] titre Logs — Ce qu’il ne faut pas faire
> **Exemple à éviter**
> 
> ### 15/10 — MàJ Restes
> On a fait plein de trucs hier. D’abord on a regardé un peu les fichiers et on a vu des différences diverses.
> - Résolution : par liens et d’autres trucs
> - Diff: post_date et tags changent, parfois on renomme mais pas toujours
> - On a aussi fait des tests et on a mis un message si c’était à jour, bref rien de spécial
> 
> **Pourquoi c’est mauvais**
> - Date **non normalisée** (“15/10”) et **résumé absent** (pas de blockquote clair).
> - **Paragraphes longs** et flous; pas de liste **exhaustive** ni de conditions explicites (A/B).
> - **Lignes vides** entre puces; formulations vagues (“d’autres trucs”, “bref”).
> - Champs non formatés (pas de `` `mon_champ` ``), jargon/ambiguïtés.
> - Informations **incomplètes** (pas de règle de rename, pas de cas “zéro différence”).
