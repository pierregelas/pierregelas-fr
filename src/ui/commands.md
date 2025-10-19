// src/ui/commands.ts
// Commande "Importer un CSV WordPress" + picker CSV + prévisualisation + sélection du dossier de sortie
// - Notice fin: "Import WP — +{created}, −{updated} (≃ ident./modif.), ✖{errors}"
// - Journal .md dans NEW/LOGS/import-YYYYMMDD-HHMMSS.md
// - NEW: breakdown mises à jour (identiques / modifiées) + listes en wikilinks triés
// - NEW: pour les "Modifiées", logue les champs modifiés après le wikilink

import { App, Notice, TFile, TFolder, FileSystemAdapter, FuzzySuggestModal } from "obsidian";
import { importWordpressCsv } from "@actions/importWordpress";
import type { VaultIO } from "@core/upsert";
import { ImportPreviewModal } from "./previewModal";

function getVaultRootAbs(app: App): string {
  const adapter = app.vault.adapter;
  if (adapter instanceof FileSystemAdapter) {
	const base = adapter.getBasePath();
	return String(base).replace(/[\/\\]+$/, "");
  }
  throw new Error("getBasePath() indisponible : FileSystemAdapter requis (desktop).");
}
function toAbs(app: App, relPath: string): string {
  const base = getVaultRootAbs(app);
  const rel = relPath.replace(/^[\/\\]+/, "");
  return `${base}/${rel}`.replace(/[\/\\]+/g, "/");
}
function toRel(app: App, absPath: string): string {
  const base = getVaultRootAbs(app);
  return absPath.replace(new RegExp(`^${base}[\\/]?`), "");
}
function basenameNoExt(rel: string): string {
  const m = rel.match(/([^\/]+)\.md$/i);
  return m ? m[1] : rel.replace(/\.md$/i, "");
}
function relToWikiTitleOnly(rel: string): string {
  return `[[${basenameNoExt(rel)}]]`;
}

function makeVaultIO(app: App): VaultIO {
  return {
	exists: async (absPath) => app.vault.adapter.exists(toRel(app, absPath)),
	read:   async (absPath) => app.vault.adapter.read(toRel(app, absPath)),
	write:  async (absPath, data) => {
	  const rel = toRel(app, absPath);
	  const dir = rel.replace(/\/[^\/]+$/, "");
	  if (dir && !(await app.vault.adapter.exists(dir))) {
		await app.vault.adapter.mkdir(dir);
	  }
	  await app.vault.adapter.write(rel, data);
	},
	listMarkdownPaths: async () =>
	  app.vault
		.getFiles()
		.filter((f: TFile) => f.extension.toLowerCase() === "md")
		.map((f: TFile) => toAbs(app, f.path)),
  };
}

class CsvPickerModal extends FuzzySuggestModal<TFile> {
  private picked = false;
  constructor(private appRef: App, private onPick: (absPath: string|null) => void) {
	super(appRef);
	this.setPlaceholder("Choisir un fichier CSV à importer…");
  }
  getItems(): TFile[] {
	return this.appRef.vault.getFiles().filter(f => f.extension.toLowerCase() === "csv");
  }
  getItemText(file: TFile): string {
	return file.path;
  }
  onChooseItem(file: TFile): void {
	this.picked = true;
	const abs = toAbs(this.appRef, file.path);
	this.onPick(abs);
  }
  onClose(): void {
	if (!this.picked) this.onPick(null);
	super.onClose();
  }
}

/* ------------------------------------ helpers dirs ------------------------------------ */

function listVaultFoldersRel(app: App): string[] {
  const out: string[] = [];
  const files = app.vault.getAllLoadedFiles();
  for (const f of files) {
	if (f instanceof TFolder) {
	  const p = f.path.replace(/^[\/\\]+|[\/\\]+$/g, "");
	  if (p) out.push(p);
	}
  }
  const set = new Set(out);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
	d.getFullYear().toString() +
	pad(d.getMonth()+1) +
	pad(d.getDate()) + "-" +
	pad(d.getHours()) +
	pad(d.getMinutes()) +
	pad(d.getSeconds())
  );
}

function sortedTitles(app: App, absPaths: string[]): string[] {
  const rels = absPaths.map(p => toRel(app, p));
  const base = rels.map(basenameNoExt);
  base.sort((a, b) => a.localeCompare(b));
  return base;
}

async function writeImportLog(
  app: App,
  summary: any, // ImportSummary étendu
  csvAbs: string,
  outDirRel: string
) {
  const logsDirRel = "NEW/LOGS";
  const logsDirAbs = toAbs(app, logsDirRel);
  const exists = await app.vault.adapter.exists(toRel(app, logsDirAbs));
  if (!exists) await app.vault.adapter.mkdir(toRel(app, logsDirAbs));

  const fileRel = `${logsDirRel}/import-${nowStamp()}.md`;
  const fileAbs = toAbs(app, fileRel);

  const lines: string[] = [];
  lines.push("# Journal d’import WordPress");
  lines.push("");
  lines.push(`- Date: ${new Date().toISOString()}`);
  lines.push(`- Fichier CSV: ${toRel(app, csvAbs)}`);
  lines.push(`- Dossier de sortie: ${outDirRel}`);
  lines.push("");
  lines.push("## Résumé");
  lines.push(`- Créés: ${summary.created ?? 0}`);
  lines.push(`- MAJ: ${summary.updated ?? 0}`);
  lines.push(`  - identiques: ${summary.updated_identical ?? 0}`);
  lines.push(`  - modifiées: ${summary.updated_modified ?? 0}`);
  lines.push(`- Erreurs: ${summary.errors ?? 0}`);
  lines.push("");

  // Listes
  const createdTitles = sortedTitles(app, summary.created_paths ?? []);
  const updIdentTitles = sortedTitles(app, summary.updated_identical_paths ?? []);
  const updModDetails: { path: string; fields: string[] }[] = (summary.updated_modified_details ?? []).slice();
  // Tri logique par titre
  updModDetails.sort((a, b) => {
	const ta = basenameNoExt(toRel(app, a.path));
	const tb = basenameNoExt(toRel(app, b.path));
	return ta.localeCompare(tb);
  });
  const errorTitles = sortedTitles(app, summary.error_paths ?? []);

  if (createdTitles.length) {
	lines.push("## Créés");
	for (const t of createdTitles) lines.push(`- [[${t}]]`);
	lines.push("");
  }
  if (updModDetails.length) {
	lines.push("## Modifiées");
	for (const it of updModDetails) {
	  const t = basenameNoExt(toRel(app, it.path));
	  const fields = (it.fields ?? []).join(", ");
	  lines.push(`- [[${t}]] — champs modifiés: ${fields || "(inconnu)"}`);
	}
	lines.push("");
  }
  if (updIdentTitles.length) {
	lines.push("## Identiques");
	for (const t of updIdentTitles) lines.push(`- [[${t}]]`);
	lines.push("");
  }
  if (errorTitles.length) {
	lines.push("## Erreurs");
	for (const t of errorTitles) lines.push(`- [[${t}]]`);
	lines.push("");
  }

  await app.vault.adapter.write(toRel(app, fileAbs), lines.join("\n"));
}

/* ------------------------------------ command ------------------------------------ */

export function registerImportWordpressCommand(
  app: App,
  addCommand: (spec: { id: string; name: string; callback: () => void }) => void
): void {
  const io = makeVaultIO(app);

  addCommand({
	id: "importer-csv-wordpress",
	name: "Importer un CSV WordPress",
	callback: async () => {
	  try {
		const picker = new CsvPickerModal(app, async (csvAbs) => {
		  if (!csvAbs) {
			new Notice("Aucun fichier .csv sélectionné.");
			return;
		  }
		  try {
			const defaultOutRel = "NEW";
			const folderListRel = listVaultFoldersRel(app);
			const csvFileName = csvAbs.replace(/^.*[\\/]/, "");
			const csvFileName = csvAbs.replace(/^.*[\\/]/, "");

			// Dry-run => calcule aussi identiques/modifiées
			const drySummary: any = await importWordpressCsv(csvAbs, io, { outDirAbs: outDirAbsDefault, dryRun: true });

			// Modale de prévisualisation + sélection dossier
			const modal = new ImportPreviewModal(
			  app,
			  drySummary,
			  async (outDirRelChosen) => {
				const outDirAbs = toAbs(app, outDirRelChosen || defaultOutRel);
				const summary: any = await importWordpressCsv(csvAbs, io, { outDirAbs, dryRun: false });

				new Notice(`Import WP — +${summary.created}, −${summary.updated} (≃ ${summary.updated_identical} ident., ${summary.updated_modified} modif.), ✖${summary.errors}`);

				await writeImportLog(app, summary, csvAbs, outDirRelChosen || defaultOutRel);
			  },
			  { folderListRel, defaultOutDirRel: defaultOutRel, csvFileName }
			);
			modal.open();
		  } catch (e: any) {
			console.error(e);
			new Notice(`Import WP — erreur: ${String(e?.message ?? e)}`);
		  }
		});

		if (picker.getItems().length === 0) {
		  new Notice("Aucun fichier .csv trouvé dans la vault.");
		  return;
		}
		picker.open();
	  } catch (err: any) {
		console.error(err);
		new Notice(`Import WP — erreur: ${String(err?.message ?? err)}`);
	  }
	},
  });
}
