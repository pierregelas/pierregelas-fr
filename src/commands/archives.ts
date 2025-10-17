// src/commands/archives.ts
// P1: créer une note "Archives du futur" depuis une note Journal photo
// P2: mettre à jour une note "Archives du futur" existante (diff + patch YAML + rename)

import type { Plugin, TFile } from "obsidian";
import { Notice } from "obsidian";

import {
  isJournalPhotoCategory,
  deriveArchivesTitlesFromLinkText,
  toBfImageNameFromWp,
} from "../services/archivesUtils";
import { buildArchivesYaml } from "../services/yamlBuilder";
import { createNoteFile } from "../services/fileUtils";
import { applyYamlPatch } from "../services/yamlPatch";
import {
  openArchivesDiffModal,
  type DiffModel,
  type DiffItem,
} from "../modals/archivesDiffModal";
import { buildArchivesLinkTitle } from "../services/journalUtils";
import { openInfoModal } from "../modals/simpleInfoModal";


/* ======================================================================== */
/* ================================ P1 ==================================== */
/* ======================================================================== */

export function registerArchivesCommand(plugin: Plugin): void {
  plugin.addCommand({
	id: "create-archives-from-journal",
	name: "Créer/Mettre à jour une note Archives du futur (P1)",
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
	  const lienArchivesRaw = str(fm.lien_archives); // ex: "[[…]]"
	  const lienRestes = str(fm.lien_restes); // ex: "[[…]]" ou vide
	  const imgFilenameWP = str(fm.img_filename); // ex: …_WP.webp

	  if (!postTitreFullJournal || !postDateIso || !lienArchivesRaw) {
		new Notice(
		  "Frontmatter incomplet (post_titre_full, post_date, lien_archives nécessaires).",
		  6000
		);
		return;
	  }

	  // 2) Déduire le titre cible depuis lien_archives (texte sans [[ ]])
	  const archivesTitle = unwrapWiki(lienArchivesRaw);
	  if (!archivesTitle) {
		new Notice("Le champ 'lien_archives' est vide ou mal formé.", 6000);
		return;
	  }

	  // 2.a) Stop si la note cible existe déjà (Processus 2 s'applique)
	  const targetPath = `${archivesTitle}.md`;
	  if (app.vault.getAbstractFileByPath(targetPath)) {
		new Notice("La note « Archives du futur » est déjà créée !", 6000);
		return;
	  }

	  // 3) Dérivations pour la note Archives
	  const { postTitre1, postTitre2, postTitreFull } =
		deriveArchivesTitlesFromLinkText(archivesTitle);
	  if (!postTitreFull || !postTitre1) {
		new Notice(
		  "Impossible de dériver les titres Archives depuis 'lien_archives'.",
		  6000
		);
		return;
	  }

	  const imgFilenameBF = toBfImageNameFromWp(imgFilenameWP);
	  const lienJournal = wrapWiki(postTitreFullJournal);

	  // 4) YAML Archives (toutes les clés présentes)
	  const yaml = buildArchivesYaml({
		imgFilenameBF,
		postTitre1,
		postTitre2,
		postTitreFull,
		postDate: postDateIso,
		lienJournal,
		lienRestes,
	  });

	  // 5) Corps de note
	  const body = [
		"## Photo",
		`![[${imgFilenameBF}]]`,
		"",
		"## Notes",
		`![[${postTitreFull}_notes]]`,
	  ].join("\n");

	  // 6) Création de la nouvelle note (nom = texte de lien_archives)
	  try {
		const created = await createNoteFile(app.vault, archivesTitle, yaml, body);
		new Notice(`Note « Archives du futur » créée : ${created.name}`, 4000);
	  } catch (err: any) {
		console.error("[pierregelas-fr] createNoteFile error:", err);
		new Notice(`Erreur lors de la création de la note : ${err?.message ?? err}`, 8000);
	  }
	},
  });

  /* ====================================================================== */
  /* ================================ P2 ================================== */
  /* ====================================================================== */

  plugin.addCommand({
	id: "update-archives-from-journal",
	name: "Mettre à jour une note Archives du futur (P2)",
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

	  // Titre Journal: on privilégie le YAML (après ta commande de recalcul),
	  // fallback sur le nom de fichier pour robustesse.
	  const jTitreFullYaml = str(jFm.post_titre_full);
	  const jTitreFullFile = basenameNoExt(journalFile.name);
	  const jTitreFull = jTitreFullYaml || jTitreFullFile;

	  const jDateIso = str(jFm.post_date);
	  const jLienArchivesRaw = str(jFm.lien_archives);
	  const jLienRestes = str(jFm.lien_restes);
	  const jImgFilenameWP = str(jFm.img_filename);
	  const jTags = toStringArray(jFm.tags);

	  if (!jTitreFull || !jDateIso) {
		new Notice("Frontmatter Journal incomplet (post_titre_full, post_date).", 6000);
		return;
	  }

	  // 1) Résoudre la note Archives cible
	  // 1.a) d'abord via lien_archives si présent
	  const archivesTitleFromLink = unwrapWiki(jLienArchivesRaw || "");
	  let archivesFile: TFile | null = archivesTitleFromLink
		? (app.vault.getAbstractFileByPath(`${archivesTitleFromLink}.md`) as TFile | null)
		: null;

	  // 1.b) fallback via post_date + post_cat=archives-du-futur
	  if (!archivesFile) {
		archivesFile = findArchivesByPostDate(app, jDateIso);
	  }
	  if (!archivesFile) {
		new Notice(
		  "Note « Archives du futur » introuvable (via lien_archives / post_date).",
		  7000
		);
		return;
	  }

	  // 2) Lire YAML Archives
	  const aFm = getFrontmatter(app, archivesFile);
	  if (!aFm) {
		new Notice("Aucun frontmatter YAML détecté dans la note Archives.", 6000);
		return;
	  }

	  const aTitreFull = str(aFm.post_titre_full);
	  const aTitre1 = str(aFm.post_titre_1);
	  const aTitre2 = str(aFm.post_titre_2);
	  const aDateIso = str(aFm.post_date);
	  const aImgFilename = str(aFm.img_filename);
	  const aLienJournal = str(aFm.lien_journal);
	  const aLienRestes = str(aFm.lien_restes);
	  const aTags = toStringArray(aFm.tags);

	  // 3) Préparer le recalcul "titre cible Archives" à partir du Journal actuel
	  //    (si le titre Journal a changé, le lien souhaité change)
	  const sourceTitleForDerivation = jTitreFull || jTitreFullFile;
	  const archivesDesiredLink = unwrapWiki(
		buildArchivesLinkTitle(sourceTitleForDerivation)
	  ); // texte sans [[ ]]
	  const titleChanged = !eqCaseSensitive(archivesDesiredLink, aTitreFull);

	  // ✅ Si rien à synchroniser (A et B), on sort proprement
	  const noAChanges =
		eqCaseSensitive(aDateIso, jDateIso) && sameStringArray(aTags, jTags);
	  if (!titleChanged && noAChanges) {
		await openInfoModal(app, "Archives du futur", "La note « Archives du futur » est parfaitement à jour !");
		return;
	  }

	  // 4) Construire la diff
	  const items: DiffItem[] = [];

	  // Bloc A — communs (toujours proposés, mais décochés si identiques)
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
		  deriveArchivesTitlesFromLinkText(archivesDesiredLink);

		const imgFilenameBF = toBfImageNameFromWp(jImgFilenameWP);
		const cover = imgFilenameBF;
		const lienJournalNew = wrapWiki(jTitreFull);
		const lienRestesNew = jLienRestes; // copie directe depuis Journal

		suggestedRename = postTitreFull; // nom de fichier souhaité

		// Titres
		items.push({
		  key: "post_titre_1",
		  label: "Titre 1 (Archives)",
		  before: aTitre1,
		  after: postTitre1,
		  group: "B",
		  checked: !eqCaseSensitive(aTitre1, postTitre1),
		});
		items.push({
		  key: "post_titre_2",
		  label: "Titre 2 (Archives)",
		  before: aTitre2,
		  after: postTitre2,
		  group: "B",
		  checked: !eqCaseSensitive(aTitre2, postTitre2),
		});
		items.push({
		  key: "post_titre_full",
		  label: "Titre complet (Archives)",
		  before: aTitreFull,
		  after: postTitreFull,
		  group: "B",
		  checked: !eqCaseSensitive(aTitreFull, postTitreFull),
		});

		// Image & cover
		items.push({
		  key: "img_filename",
		  label: "Image (BF)",
		  before: aImgFilename,
		  after: imgFilenameBF,
		  group: "B",
		  checked: !eqCaseSensitive(aImgFilename, imgFilenameBF),
		});
		items.push({
		  key: "cover",
		  label: "Cover",
		  before: aImgFilename, // (cover=img dans notre modèle P1)
		  after: cover,
		  group: "B",
		  checked: !eqCaseSensitive(aImgFilename, cover),
		});
		items.push({
		  key: "img_alt",
		  label: "Alt de l’image",
		  before: aTitre1, // (alt = post_titre_1 Archives)
		  after: postTitre1,
		  group: "B",
		  checked: !eqCaseSensitive(aTitre1, postTitre1),
		});
		items.push({
		  key: "img_legende",
		  label: "Légende de l’image",
		  before: aTitreFull, // (legende = post_titre_full Archives)
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
		  key: "lien_restes",
		  label: "Lien vers Restes",
		  before: aLienRestes,
		  after: lienRestesNew,
		  group: "B",
		  checked: !eqCaseSensitive(aLienRestes, lienRestesNew),
		});
	  }

	  // 5) Ouvrir modale de diff
	  const model: DiffModel = {
		items,
		suggestedRename,
	  };
	  const result = await openArchivesDiffModal(app, model);
	  if (!result) return; // annulé

	  if (result.applyKeys.length === 0 && !result.renameTo) {
		new Notice("Aucun changement sélectionné.", 4000);
		return;
	  }

	  // 6) Appliquer patch YAML
	  try {
		const content = await app.vault.read(archivesFile);
		const updates: Record<string, string | string[] | null> = {};

		for (const it of items) {
		  if (result.applyKeys.includes(it.key)) {
			// Normalisation des valeurs (string|string[])
			updates[it.key] = Array.isArray(it.after)
			  ? (it.after as string[])
			  : (String(it.after ?? "") as string);
		  }
		}

		const patched = applyYamlPatch(content, updates);
		await app.vault.modify(archivesFile, patched);

		// 7) Rename si demandé
		if (result.renameTo) {
		  const targetName = result.renameTo.trim();
		  if (targetName && !eqCaseSensitive(targetName, basenameNoExt(archivesFile.name))) {
			await app.vault.rename(archivesFile, `${targetName}.md`);
		  }
		}

		new Notice("Note « Archives du futur » mise à jour.", 4000);
	  } catch (err: any) {
		console.error("[pierregelas-fr] P2 apply error:", err);
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

function findArchivesByPostDate(app: Plugin["app"], postDateIso: string): TFile | null {
  const files = app.vault.getMarkdownFiles();
  for (const f of files) {
	const fm = app.metadataCache.getFileCache(f)?.frontmatter;
	if (!fm) continue;
	const cat = fm.post_cat;
	const isArch =
	  (typeof cat === "string" && cat.trim().toLowerCase() === "archives-du-futur") ||
	  (Array.isArray(cat) &&
		cat.some((x) => String(x).trim().toLowerCase() === "archives-du-futur"));
	if (!isArch) continue;

	const d = fm.post_date ? String(fm.post_date).trim() : "";
	if (d && d === postDateIso) return f;
  }
  return null;
}
