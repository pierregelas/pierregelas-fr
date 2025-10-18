// src/ui/commands.ts
// Commande "Importer un CSV WordPress" + picker CSV + prévisualisation + sélection du dossier de sortie
// Ajouts :
//  - Dropdown de sélection de dossier dans la modale (valeur par défaut "NEW", même s'il n'existe pas)
//  - Notice finale: "Import WP — +{created}, −{updated}, ✖{errors}"
//  - Journal .md dans NEW/LOGS/import-YYYYMMDD-HHMMSS.md (toujours ce dossier)

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
	  const p = f.path.replace(/^[\/\\]+|[\/\\]+$/g, ""); // normalise
	  if (p) out.push(p);
	}
  }
  // dédup + tri
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

async function writeImportLog(app: App, summary: { created: number; updated: number; errors: number }, csvAbs: string, outDirRel: string) {
  const logsDirRel = "NEW/LOGS";
  const logsDirAbs = toAbs(app, logsDirRel);
  const exists = await app.vault.adapter.exists(toRel(app, logsDirAbs));
  if (!exists) {
	await app.vault.adapter.mkdir(toRel(app, logsDirAbs));
  }
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
  lines.push(`- Créés: ${summary.created}`);
  lines.push(`- MAJ: ${summary.updated}`);
  lines.push(`- Erreurs: ${summary.errors}`);
  lines.push("");

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
			// 1) Dry-run pour obtenir les comptes
			const defaultOutRel = "NEW";
			const folderListRel = listVaultFoldersRel(app);
			const outDirAbsDefault = toAbs(app, defaultOutRel);

			const drySummary = await importWordpressCsv(csvAbs, io, { outDirAbs: outDirAbsDefault, dryRun: true });

			// 2) Modale de prévisualisation + sélection dossier
			const modal = new ImportPreviewModal(
			  app,
			  drySummary,
			  async (outDirRelChosen) => {
				const outDirAbs = toAbs(app, outDirRelChosen || defaultOutRel);
				const summary = await importWordpressCsv(csvAbs, io, { outDirAbs, dryRun: false });

				// Notice +n, −m, ✖e
				new Notice(`Import WP — +${summary.created}, −${summary.updated}, ✖${summary.errors}`);

				// Journal .md (toujours NEW/LOGS)
				await writeImportLog(app, summary, csvAbs, outDirRelChosen || defaultOutRel);
			  },
			  { folderListRel, defaultOutDirRel: defaultOutRel }
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
