// src/ui/commands.ts
// Commande "Importer un CSV WordPress" + picker CSV via FuzzySuggestModal (desktop).
// Utilise l'I/O Obsidian (FileSystemAdapter) et l'action importWordpressCsv.

import { App, Notice, TFile, FileSystemAdapter, FuzzySuggestModal } from "obsidian";
import { importWordpressCsv } from "@actions/importWordpress";
import type { VaultIO } from "@core/upsert";

/* -------------------------------------------------------
   Helpers chemins ABS <-> REL (desktop uniquement)
------------------------------------------------------- */
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
  return `${base}/${rel}`;
}

function toRel(app: App, absPath: string): string {
  const base = getVaultRootAbs(app);
  return absPath.replace(new RegExp(`^${base}[\\/]?`), "");
}

/* -------------------------------------------------------
   I/O (VaultIO) — adapté à Obsidian
------------------------------------------------------- */
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

/* -------------------------------------------------------
   Modal de sélection CSV — FuzzySuggestModal (corrigé)
------------------------------------------------------- */
class CsvPickerModal extends FuzzySuggestModal<TFile> {
  private picked = false;
  private resolve!: (value: string|null) => void;
  private promise: Promise<string|null>;

  constructor(private appRef: App) {
	super(appRef);
	this.setPlaceholder("Choisir un fichier CSV à importer…");
	this.promise = new Promise<string|null>((res) => (this.resolve = res));
  }

  openAndGetSelection(): Promise<string|null> {
	const csvFiles = this.getItems();
	if (!csvFiles.length) {
	  this.resolve(null);
	  return this.promise;
	}
	this.open();
	return this.promise;
  }

  getItems(): TFile[] {
	return this.appRef.vault
	  .getFiles()
	  .filter((f) => f.extension.toLowerCase() === "csv");
  }

  getItemText(file: TFile): string {
	return file.path; // affichage: chemin complet; tu peux mettre file.name si tu préfères
  }

  onChooseItem(file: TFile): void {
	this.picked = true;
	this.resolve(toAbs(this.appRef, file.path));
	// FuzzySuggestModal ferme automatiquement après le choix
  }

  onClose(): void {
	// Ne renvoie null que si aucun choix n'a été fait
	if (!this.picked) this.resolve(null);
	super.onClose();
  }
}

/* -------------------------------------------------------
   Commande palette : "Importer un CSV WordPress"
------------------------------------------------------- */
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
		const picker = new CsvPickerModal(app);
		const csvAbs = await picker.openAndGetSelection();
		if (!csvAbs) {
		  new Notice("Aucun fichier .csv sélectionné.");
		  return;
		}

		const outDirAbs = `${getVaultRootAbs(app)}/NEW`;
		const summary = await importWordpressCsv(csvAbs, io, { outDirAbs, dryRun: false });

		new Notice(`Import WP — créés: ${summary.created}, MAJ: ${summary.updated}, erreurs: ${summary.errors}`);
	  } catch (err: any) {
		console.error(err);
		new Notice(`Import WP — erreur: ${String(err?.message ?? err)}`);
	  }
	},
  });
}
