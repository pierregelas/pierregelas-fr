// src/actions/createArchives.ts
// Actions Archives du futur : création (P1) et mise à jour (P2) avec YAML maître

import type { App, TFile } from "obsidian";
import { Notice } from "obsidian";
import { load as yamlLoad } from "js-yaml";

import type { MasterFields } from "@core/types";
import {
  buildYamlMaster,
  createEmptyMasterFields,
  normalizeMasterFields,
} from "@core/yamlMaster";
import {
  isJournalPhotoCategory,
  deriveArchivesTitlesFromLinkText,
  toBfImageNameFromWp,
} from "../services/archivesUtils";
import { createNoteFile } from "../services/fileUtils";
import { openArchivesDiffModal, type DiffItem, type DiffModel } from "../modals/archivesDiffModal";
import { buildArchivesLinkTitle } from "../services/journalUtils";
import { openInfoModal } from "../modals/simpleInfoModal";

export async function createArchivesFromJournal(app: App): Promise<void> {
  const file = app.workspace.getActiveFile();
  if (!file) {
		new Notice("Aucun fichier actif.", 5000);
		return;
  }

  const fm = getFrontmatter(app, file);
  if (!fm) {
		new Notice("Aucun frontmatter YAML détecté.", 5000);
		return;
  }
  if (!isJournalPhotoCategory(fm.post_cat)) {
		new Notice("Cette note n'est pas une note Journal Photo !", 6000);
		return;
  }

  const postTitreFullJournal = str(fm.post_titre_full);
  const postDateIso = str(fm.post_date);
  const lienArchivesRaw = str(fm.lien_archives);
  const lienRestes = str(fm.lien_restes);
  const imgFilenameWP = str(fm.img_filename);

  if (!postTitreFullJournal || !postDateIso || !lienArchivesRaw) {
		new Notice(
		  "Frontmatter incomplet (post_titre_full, post_date, lien_archives nécessaires).",
		  6000
		);
		return;
  }

  const archivesTitle = unwrapWiki(lienArchivesRaw);
  if (!archivesTitle) {
		new Notice("Le champ 'lien_archives' est vide ou mal formé.", 6000);
		return;
  }

  const targetPath = `${archivesTitle}.md`;
  if (app.vault.getAbstractFileByPath(targetPath)) {
		new Notice("La note « Archives du futur » est déjà créée !", 6000);
		return;
  }

  const { postTitre1, postTitre2, postTitreFull } = deriveArchivesTitlesFromLinkText(archivesTitle);
  if (!postTitreFull || !postTitre1) {
		new Notice(
		  "Impossible de dériver les titres Archives depuis 'lien_archives'.",
		  6000
		);
		return;
  }

  const imgFilenameBF = toBfImageNameFromWp(imgFilenameWP);
  const lienJournal = wrapWiki(postTitreFullJournal);

  const master = createEmptyMasterFields();
  master.cover = imgFilenameBF;
  master.img_alt = [postTitre1];
  master.img_filename = [imgFilenameBF];
  master.img_legende = [postTitreFull];
  master.lien_archives = null;
  master.lien_journal = lienJournal;
  master.lien_projet = ["[[Photo]]", "[[Archives du futur]]"];
  master.lien_restes = lienRestes || null;
  master.maj_wp = true;
  master.post_cat = ["photo", "archives-du-futur"];
  master.post_date = postDateIso;
  master.post_descr = null;
  master.post_extrait = null;
  master.post_id = "";
  master.post_mod = postDateIso;
  master.post_perma = null;
  master.post_titre_1 = postTitre1;
  master.post_titre_2 = postTitre2;
  master.post_titre_full = postTitreFull;
  master.post_vid_url = null;
  master.tags = [];
  master.wp_carnet_link = null;
  master.wp_carnet_on = false;
  master.wp_status = null;
  master.wp_import_dataset_key = null;
  master.wp_import_dataset_id = null;

  const yaml = buildYamlMaster(master, "archives");
  const body = [
		"## Photo",
		`![[${imgFilenameBF}]]`,
		"",
		"## Notes",
		`![[${postTitreFull}_notes]]`,
  ].join("\n");

  try {
		const created = await createNoteFile(app.vault, archivesTitle, yaml, body);
		new Notice(`Note « Archives du futur » créée : ${created.name}`, 4000);
  } catch (err: any) {
		console.error("[pierregelas-fr] createArchives error:", err);
		new Notice(`Erreur lors de la création de la note : ${err?.message ?? err}`, 8000);
  }
}

export async function updateArchivesFromJournal(app: App): Promise<void> {
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

  const archivesTitleFromLink = unwrapWiki(jLienArchivesRaw || "");
  let archivesFile: TFile | null = archivesTitleFromLink
		? (app.vault.getAbstractFileByPath(`${archivesTitleFromLink}.md`) as TFile | null)
		: null;
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

  const aFm = getFrontmatter(app, archivesFile);
  if (!aFm) {
		new Notice("Aucun frontmatter YAML détecté dans la note Archives.", 6000);
		return;
  }

  const aTitreFull = str(aFm.post_titre_full);
  const aTitre1 = str(aFm.post_titre_1);
  const aTitre2 = str(aFm.post_titre_2);
  const aDateIso = str(aFm.post_date);
  const aImgFilename = extractFirstString(aFm.img_filename);
  const aLienJournal = str(aFm.lien_journal);
  const aLienRestes = str(aFm.lien_restes);
  const aTags = toStringArray(aFm.tags);

  const sourceTitleForDerivation = jTitreFull || jTitreFullFile;
  const archivesDesiredLink = unwrapWiki(buildArchivesLinkTitle(sourceTitleForDerivation));
  const titleChanged = !eqCaseSensitive(archivesDesiredLink, aTitreFull);

  const noAChanges = eqCaseSensitive(aDateIso, jDateIso) && sameStringArray(aTags, jTags);
  if (!titleChanged && noAChanges) {
		await openInfoModal(app, "Archives du futur", "La note « Archives du futur » est parfaitement à jour !");
		return;
  }

  const items: DiffItem[] = [];
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

  let suggestedRename: string | undefined;
  if (titleChanged) {
		const { postTitre1, postTitre2, postTitreFull } =
		  deriveArchivesTitlesFromLinkText(archivesDesiredLink);

		const imgFilenameBF = toBfImageNameFromWp(jImgFilenameWP);
		const cover = imgFilenameBF;
		const lienJournalNew = wrapWiki(jTitreFull);
		const lienRestesNew = jLienRestes;

		suggestedRename = postTitreFull;

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

		items.push({
		  key: "img_filename",
		  label: "Image (BF)",
		  before: aImgFilename ? [aImgFilename] : [],
		  after: imgFilenameBF ? [imgFilenameBF] : [],
		  group: "B",
		  checked: !eqCaseSensitive(aImgFilename, imgFilenameBF),
		});
		items.push({
		  key: "cover",
		  label: "Cover",
		  before: aImgFilename,
		  after: cover,
		  group: "B",
		  checked: !eqCaseSensitive(aImgFilename, cover),
		});
		items.push({
		  key: "img_alt",
		  label: "Alt de l’image",
		  before: aTitre1 ? [aTitre1] : [],
		  after: postTitre1 ? [postTitre1] : [],
		  group: "B",
		  checked: !eqCaseSensitive(aTitre1, postTitre1),
		});
		items.push({
		  key: "img_legende",
		  label: "Légende de l’image",
		  before: aTitreFull ? [aTitreFull] : [],
		  after: postTitreFull ? [postTitreFull] : [],
		  group: "B",
		  checked: !eqCaseSensitive(aTitreFull, postTitreFull),
		});

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

  const model: DiffModel = {
		items,
		suggestedRename,
  };
  const result = await openArchivesDiffModal(app, model);
  if (!result) return;

  if (result.applyKeys.length === 0 && !result.renameTo) {
		new Notice("Aucun changement sélectionné.", 4000);
		return;
  }

  try {
		const { master: currentMaster, body } = await readMasterAndBody(app, archivesFile);
		const nextMaster: MasterFields = { ...currentMaster };

		for (const key of result.applyKeys) {
		  const item = items.find((it) => it.key === key);
		  if (!item) continue;
		  applyMasterUpdate(nextMaster, key, item.after);
		}

		const yaml = buildYamlMaster(nextMaster, "archives");
		const content = assembleDocument(yaml, body);
		await app.vault.modify(archivesFile, content);

		if (result.renameTo) {
		  const targetName = result.renameTo.trim();
		  if (targetName && !eqCaseSensitive(targetName, basenameNoExt(archivesFile.name))) {
				await app.vault.rename(archivesFile, `${targetName}.md`);
		  }
		}

		new Notice("Note « Archives du futur » mise à jour.", 4000);
  } catch (err: any) {
		console.error("[pierregelas-fr] Archives update error:", err);
		new Notice(`Erreur lors de la mise à jour : ${err?.message ?? err}`, 8000);
  }
}

/* -------------------- helpers -------------------- */

function getFrontmatter(app: App, file: TFile): Record<string, unknown> | null {
  const cache = app.metadataCache.getFileCache(file);
  const fm = cache?.frontmatter;
  if (!fm) return null;
  const out: Record<string, unknown> = {};
  for (const k in fm) {
		if (k && k !== "position") out[k] = (fm as any)[k];
  }
  return out;
}

function readFrontmatterAndBody(raw: string): { yaml: string; body: string } {
  const text = (raw ?? "").replace(/\r\n?/g, "\n");
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { yaml: "", body: text };
  const fm = match[1] ?? "";
  const rest = text.slice(match[0].length);
  return { yaml: fm, body: rest };
}

async function readMasterAndBody(app: App, file: TFile): Promise<{ master: MasterFields; body: string }> {
  const raw = await app.vault.read(file);
  const { yaml, body } = readFrontmatterAndBody(raw);
  let parsed: any = {};
  if (yaml && yaml.trim().length > 0) {
		try {
		  parsed = yamlLoad(yaml) ?? {};
		} catch (err) {
		  console.warn("[pierregelas-fr] YAML parse error", err);
		  parsed = {};
		}
  }
  const master = normalizeMasterFields(parsed as Partial<MasterFields>);
  return { master, body };
}

function assembleDocument(yaml: string, body: string): string {
  const yamlBlock = yaml.endsWith("\n") ? yaml : `${yaml}\n`;
  const normalizedBody = body.replace(/\r\n?/g, "\n");
  let content = yamlBlock;
  if (normalizedBody.length > 0) {
		if (!normalizedBody.startsWith("\n")) content += "\n";
		content += normalizedBody;
  } else if (!content.endsWith("\n")) {
		content += "\n";
  }
  if (!content.endsWith("\n")) content += "\n";
  return content;
}

function applyMasterUpdate(master: MasterFields, key: string, value: string | string[]): void {
  const arrayKeys = new Set([
		"img_alt",
		"img_descr",
		"img_filename",
		"img_id",
		"img_legende",
		"img_titre",
		"img_url",
		"lien_projet",
		"post_cat",
		"tags",
  ]);

  if (arrayKeys.has(key)) {
		const arr = Array.isArray(value)
		  ? value.map((v) => String(v ?? "").trim()).filter(Boolean)
		  : [String(value ?? "").trim()].filter(Boolean);
		(master as any)[key] = arr;
		return;
  }

  if (key === "lien_archives" || key === "lien_journal" || key === "lien_restes") {
		(master as any)[key] = value ? String(value) : null;
		return;
  }

  (master as any)[key] = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function extractFirstString(v: unknown): string {
  if (Array.isArray(v)) {
		const first = v.length ? v[0] : "";
		return typeof first === "string" ? first.trim() : String(first ?? "");
  }
  return str(v);
}

function toStringArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  return s ? [s] : [];
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

function findArchivesByPostDate(app: App, postDateIso: string): TFile | null {
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
