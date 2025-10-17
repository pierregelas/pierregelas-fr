// src/ui/commands.ts
// Commande "Importer un CSV WordPress" + picker CSV via FuzzySuggestModal (desktop).
// Ajout: modale de prévisualisation (dry-run) avec Mettre à jour / Annuler.

import { App, Notice, TFile, FileSystemAdapter, FuzzySuggestModal } from "obsidian";
import { importWordpressCsv } from "@actions/importWordpress";
import type { VaultIO } from "@core/upsert";
import { ImportPreviewModal } from "./previewModal";

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
   Modal de sélection CSV — FuzzySuggestModal, callback onPick
------------------------------------------------------- */
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
	return file.path; // ou file.name si tu préfères
  }

  onChooseItem(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
	this.picked = true;
	const abs = toAbs(this.appRef, file.path);
	this.onPick(abs);
  }

  onClose(): void {
	if (!this.picked) this.onPick(null);
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
		const picker = new CsvPickerModal(app, async (csvAbs) => {
		  if (!csvAbs) {
			new Notice("Aucun fichier .csv sélectionné.");
			return;
		  }
		  try {
			const outDirAbs = `${getVaultRootAbs(app)}/NEW`;

			// 1) Dry-run pour obtenir les comptes
			const drySummary = await importWordpressCsv(csvAbs, io, { outDirAbs, dryRun: true });

			// 2) Modale de prévisualisation
			const modal = new ImportPreviewModal(app, drySummary, async () => {
			  const summary = await importWordpressCsv(csvAbs, io, { outDirAbs, dryRun: false });
			  new Notice(`Import WP — créés: ${summary.created}, MAJ: ${summary.updated}, erreurs: ${summary.errors}`);
			});
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
