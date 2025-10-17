// src/commands/restes.ts
// P1: créer une note "Restes du futur" depuis une note Journal photo
// P2: mettre à jour une note "Restes du futur" existante (diff + patch YAML + rename)

import type { Plugin, TFile } from "obsidian";
import { Notice } from "obsidian";

import {
  isJournalPhotoCategory,
  deriveRestesTitlesFromLinkText,
  toReiImageNameFromWp,
} from "../services/archivesUtils";
import { buildRestesYaml } from "../services/yamlBuilder";
import { createNoteFile } from "../services/fileUtils";
import { applyYamlPatch } from "../services/yamlPatch";
import {
  openArchivesDiffModal,
  type DiffModel,
  type DiffItem,
} from "../modals/archivesDiffModal";
import { buildRestesLinkTitle } from "../services/journalUtils";

/* ======================================================================== */
/* ================================ P1 ==================================== */
/* ======================================================================== */

export function registerRestesCommand(plugin: Plugin): void {
  plugin.addCommand({
	id: "create-restes-from-journal",
	name: "Créer/Mettre à jour une note Restes du futur (P1)",
	callback: async () => {
	  const { app } = plugin;

	  // 0) Fichier courant
	  const file = app.workspace.getActiveFile();
	  if (!file) {
		new Notice("Aucun fichier actif.", 5000);
		return;
	  }

	  // 1) Lire le YAML de la note Journal source
	  const fm = getFrontmatter(app, file);
	  if (!fm) {
		new Notice("Aucun frontmatter YAML détecté.", 5000);
		return;
	  }

	  // 1.a) Précondition: catégorie "journal-photo"
	  if (!isJournalPhotoCategory(fm.post_cat)) {
		new Notice("Cette note n'est pas une note Journal Photo !", 6000);
		return;
	  }

	  const postTitreFullJournal = str(fm.post_titre_full);
	  const postDateIso = str(fm.post_date);
	  const lienRestesRaw = str(fm.lien_restes);     // ex: "[[…]]"
	  const lienArchivesRaw = str(fm.lien_archives); // ex: "[[…]]"
	  const imgFilenameWP = str(fm.img_filename);    // ex: …_WP.webp

	  if (!postTitreFullJournal || !postDateIso || !lienRestesRaw) {
		new Notice(
		  "Frontmatter incomplet (post_titre_full, post_date, lien_restes nécessaires).",
		  6000
		);
		return;
	  }

	  // 2) Déduire le titre cible depuis lien_restes (texte sans [[ ]])
	  const restesTitle = unwrapWiki(lienRestesRaw);
	  if (!restesTitle) {
		new Notice("Le champ 'lien_restes' est vide ou mal formé.", 6000);
		return;
	  }

	  // 2.a) Stop si la note cible existe déjà (Processus 2 s'applique)
	  const targetPath = `${restesTitle}.md`;
	  if (app.vault.getAbstractFileByPath(targetPath)) {
		new Notice("La note « Restes du futur » est déjà créée !", 6000);
		return;
	  }

	  // 3) Dérivations pour la note Restes
	  const { postTitre1, postTitre2, postTitreFull } =
		deriveRestesTitlesFromLinkText(restesTitle);
	  if (!postTitreFull || !postTitre1) {
		new Notice(
		  "Impossible de dériver les titres Restes depuis 'lien_restes'.",
		  6000
		);
		return;
	  }

	  const imgFilenameREI = toReiImageNameFromWp(imgFilenameWP);
	  const lienJournal = wrapWiki(postTitreFullJournal);
	  const lienArchives = lienArchivesRaw; // copie directe (wikilink)

	  // 4) YAML Restes (toutes les clés présentes)
	  // NB: l'input s'appelle encore imgFilenameBF dans le builder, on lui passe bien le nom en _REI.
		
	  const yaml = buildRestesYaml({
		imgFilenameBF: imgFilenameREI,
		postTitre1,
		postTitre2,
		postTitreFull,
		postDate: postDateIso,
		lienJournal,
		lienArchives,
	  });

	  // 5) Corps de note
	  const body = [
		"## Photo",
		`![[${imgFilenameREI}]]`,
		"",
		"## Notes",
		`![[${postTitreFull}_notes]]`,
	  ].join("\n");

	  // 6) Création de la nouvelle note (nom = texte de lien_restes)
	  try {
		const created = await createNoteFile(app.vault, restesTitle, yaml, body);
		new Notice(`Note « Restes du futur » créée : ${created.name}`, 4000);
	  } catch (err: any) {
		console.error("[pierregelas-fr] createNoteFile (restes) error:", err);
		new Notice(`Erreur lors de la création de la note : ${err?.message ?? err}`, 8000);
	  }
	},
  });

  /* ====================================================================== */
  /* ================================ P2 ================================== */
  /* ====================================================================== */

  plugin.addCommand({
	id: "update-restes-from-journal",
	name: "Mettre à jour une note Restes du futur (P2)",
	callback: async () => {
	  const { app } = plugin;

	  // 0) Fichier courant = Journal photo
	  const journalFile = app.workspace.getActiveFile();
	  if (!journalFile) {
		new Notice("Aucun fichier actif.", 5000);
		return;
	  }

	  const jFm = getFrontmatter(app, journalFile);
	  if (!jFm) {
		new Notice("Aucun frontmatter YAML détecté dans la note Journal.", 6000);
		return;
	  }
	  if (!isJournalPhotoCategory(jFm.post_cat)) {
		new Notice("Cette note n'est pas une note Journal Photo !", 6000);
		return;
	  }

	  // Titre Journal (pré-synchronisé via ta commande dédiée) : YAML prioritaire, fallback nom de fichier
	  const jTitreFullYaml = str(jFm.post_titre_full);
	  const jTitreFullFile = basenameNoExt(journalFile.name);
	  const jTitreFull = jTitreFullYaml || jTitreFullFile;

	  const jDateIso = str(jFm.post_date);
	  const jLienRestesRaw = str(jFm.lien_restes);
	  const jLienArchivesRaw = str(jFm.lien_archives);
	  const jImgFilenameWP = str(jFm.img_filename);
	  const jTags = toStringArray(jFm.tags);

	  if (!jTitreFull || !jDateIso) {
		new Notice("Frontmatter Journal incomplet (post_titre_full, post_date).", 6000);
		return;
	  }

	  // 1) Résoudre la note Restes cible
	  // 1.a) d'abord via lien_restes si présent
	  const restesTitleFromLink = unwrapWiki(jLienRestesRaw || "");
	  let restesFile: TFile | null = restesTitleFromLink
		? (app.vault.getAbstractFileByPath(`${restesTitleFromLink}.md`) as TFile | null)
		: null;

	  // 1.b) fallback via post_date + post_cat=restes-du-futur
	  if (!restesFile) {
		restesFile = findRestesByPostDate(app, jDateIso);
	  }
	  if (!restesFile) {
		new Notice(
		  "Note « Restes du futur » introuvable (via lien_restes / post_date).",
		  7000
		);
		return;
	  }

	  // 2) Lire YAML Restes
	  const aFm = getFrontmatter(app, restesFile);
	  if (!aFm) {
		new Notice("Aucun frontmatter YAML détecté dans la note Restes.", 6000);
		return;
	  }

	  const aTitreFull = str(aFm.post_titre_full);
	  const aTitre1 = str(aFm.post_titre_1);
	  const aTitre2 = str(aFm.post_titre_2);
	  const aDateIso = str(aFm.post_date);
	  const aImgFilename = str(aFm.img_filename);
	  const aLienJournal = str(aFm.lien_journal);
	  const aLienArchives = str(aFm.lien_archives);
	  const aTags = toStringArray(aFm.tags);

	  // 3) Préparer le recalcul "titre cible Restes" à partir du Journal actuel
	  const sourceTitleForDerivation = jTitreFull || jTitreFullFile;
	  const restesDesiredLink = unwrapWiki(
		buildRestesLinkTitle(sourceTitleForDerivation)
	  ); // texte sans [[ ]]
	  const titleChanged = !eqCaseSensitive(restesDesiredLink, aTitreFull);

	  // ✅ Si rien à synchroniser (A et B), on sort proprement via modale info
	  const noAChanges =
		eqCaseSensitive(aDateIso, jDateIso) && sameStringArray(aTags, jTags);
	  if (!titleChanged && noAChanges) {
		// Petite modale d'info (même UX qu'Archives)
		const { openInfoModal } = await import("../modals/simpleInfoModal");
		await openInfoModal(app, "Restes du futur", "La note « Restes du futur » est parfaitement à jour !");
		return;
	  }

	  // 4) Construire la diff
	  const items: DiffItem[] = [];

	  // Bloc A — communs (toujours proposés, décochés si identiques)
	  items.push({
		key: "post_date",
		label: "Date du post",
		before: aDateIso,
		after: jDateIso,
		group: "A",
		checked: !eqCaseSensitive(aDateIso, jDateIso),
	  });
	  items.push({
		key: "tags",
		label: "Tags",
		before: aTags,
		after: jTags,
		group: "A",
		checked: !sameStringArray(aTags, jTags),
	  });

	  // Bloc B — dérivés (uniquement si le titre a changé)
	  let suggestedRename: string | undefined;
	  if (titleChanged) {
		const { postTitre1, postTitre2, postTitreFull } =
		  deriveRestesTitlesFromLinkText(restesDesiredLink);

		const imgFilenameREI = toReiImageNameFromWp(jImgFilenameWP);
		const cover = imgFilenameREI;
		const lienJournalNew = wrapWiki(jTitreFull);
		const lienArchivesNew = jLienArchivesRaw; // copie directe depuis Journal (wikilink)

		suggestedRename = postTitreFull; // nom de fichier souhaité

		// Titres
		items.push({
		  key: "post_titre_1",
		  label: "Titre 1 (Restes)",
		  before: aTitre1,
		  after: postTitre1,
		  group: "B",
		  checked: !eqCaseSensitive(aTitre1, postTitre1),
		});
		items.push({
		  key: "post_titre_2",
		  label: "Titre 2 (Restes)",
		  before: aTitre2,
		  after: postTitre2,
		  group: "B",
		  checked: !eqCaseSensitive(aTitre2, postTitre2),
		});
		items.push({
		  key: "post_titre_full",
		  label: "Titre complet (Restes)",
		  before: aTitreFull,
		  after: postTitreFull,
		  group: "B",
		  checked: !eqCaseSensitive(aTitreFull, postTitreFull),
		});

		// Image & cover
		items.push({
		  key: "img_filename",
		  label: "Image (REI)",
		  before: aImgFilename,
		  after: imgFilenameREI,
		  group: "B",
		  checked: !eqCaseSensitive(aImgFilename, imgFilenameREI),
		});
		items.push({
		  key: "cover",
		  label: "Cover",
		  before: aImgFilename, // (cover=img dans notre modèle)
		  after: cover,
		  group: "B",
		  checked: !eqCaseSensitive(aImgFilename, cover),
		});
		items.push({
		  key: "img_alt",
		  label: "Alt de l’image",
		  before: aTitre1, // (alt = post_titre_1 Restes)
		  after: postTitre1,
		  group: "B",
		  checked: !eqCaseSensitive(aTitre1, postTitre1),
		});
		items.push({
		  key: "img_legende",
		  label: "Légende de l’image",
		  before: aTitreFull, // (legende = post_titre_full Restes)
		  after: postTitreFull,
		  group: "B",
		  checked: !eqCaseSensitive(aTitreFull, postTitreFull),
		});

		// Liens
		items.push({
		  key: "lien_journal",
		  label: "Lien vers Journal",
		  before: aLienJournal,
		  after: lienJournalNew,
		  group: "B",
		  checked: !eqCaseSensitive(aLienJournal, lienJournalNew),
		});
		items.push({
		  key: "lien_archives",
		  label: "Lien vers Archives",
		  before: aLienArchives,
		  after: lienArchivesNew,
		  group: "B",
		  checked: !eqCaseSensitive(aLienArchives, lienArchivesNew),
		});
	  }

	  // 5) Ouvrir modale de diff (titre personnalisé)
	  const model: DiffModel = {
		items,
		suggestedRename,
		dialogTitle: "Mettre à jour la note « Restes du futur »",
	  };
	  const result = await openArchivesDiffModal(app, model);
	  if (!result) return; // annulé

	  if (result.applyKeys.length === 0 && !result.renameTo) {
		new Notice("Aucun changement sélectionné.", 4000);
		return;
	  }

	  // 6) Appliquer patch YAML
	  try {
		const content = await app.vault.read(restesFile);
		const updates: Record<string, string | string[] | null> = {};

		for (const it of items) {
		  if (result.applyKeys.includes(it.key)) {
			updates[it.key] = Array.isArray(it.after)
			  ? (it.after as string[])
			  : (String(it.after ?? "") as string);
		  }
		}

		const patched = applyYamlPatch(content, updates);
		await app.vault.modify(restesFile, patched);

		// 7) Rename si demandé
		if (result.renameTo) {
		  const targetName = result.renameTo.trim();
		  if (targetName && !eqCaseSensitive(targetName, basenameNoExt(restesFile.name))) {
			await app.vault.rename(restesFile, `${targetName}.md`);
		  }
		}

		new Notice("Note « Restes du futur » mise à jour.", 4000);
	  } catch (err: any) {
		console.error("[pierregelas-fr] Restes P2 apply error:", err);
		new Notice(`Erreur lors de la mise à jour : ${err?.message ?? err}`, 8000);
	  }
	},
  });
}

/* ============================== Helpers =============================== */

function getFrontmatter(app: Plugin["app"], file: TFile): Record<string, unknown> | null {
  const cache = app.metadataCache.getFileCache(file);
  const fm = cache?.frontmatter;
  if (!fm) return null;
  const out: Record<string, unknown> = {};
  for (const k in fm) {
	if (k && k !== "position") out[k] = (fm as any)[k];
  }
  return out;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function toStringArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [String(v)];
}

function unwrapWiki(s: string): string {
  const m = s.trim().match(/^\[\[(.*)\]\]$/);
  return m ? m[1].trim() : s.trim();
}

function wrapWiki(s: string): string {
  return s ? `[[${s}]]` : "";
}

function basenameNoExt(name: string): string {
  return name.replace(/\.md$/i, "");
}

function eqCaseSensitive(a: string, b: string): boolean {
  return String(a) === String(b);
}

function sameStringArray(a: string[], b: string[]): boolean {
  const as = [...(a || [])].map(String).sort();
  const bs = [...(b || [])].map(String).sort();
  if (as.length !== bs.length) return false;
  for (let i = 0; i < as.length; i++) if (as[i] !== bs[i]) return false;
  return true;
}

function findRestesByPostDate(app: Plugin["app"], postDateIso: string): TFile | null {
  const files = app.vault.getMarkdownFiles();
  for (const f of files) {
	const fm = app.metadataCache.getFileCache(f)?.frontmatter;
	if (!fm) continue;
	const cat = fm.post_cat;
	const isRestes =
	  (typeof cat === "string" && cat.trim().toLowerCase() === "restes-du-futur") ||
	  (Array.isArray(cat) &&
		cat.some((x) => String(x).trim().toLowerCase() === "restes-du-futur"));
	if (!isRestes) continue;

	const d = fm.post_date ? String(fm.post_date).trim() : "";
	if (d && d === postDateIso) return f;
  }
  return null;
}
