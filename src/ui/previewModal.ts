// src/ui/previewModal.ts
// Modale de prévisualisation d'import CSV WordPress
// Améliorations visuelles : libellés, espacements, chips récap (+n/−m/✖e), Enter/Esc.
// Ajout : ligne "Nombre d'entrées CSV : <total> (créés + MAJ + erreurs)".

import { App, Modal } from "obsidian";
import type { ImportSummary } from "@core/types";

export interface PreviewModalOptions {
  /** Liste des dossiers existants (chemins relatifs dans la vault). */
  folderListRel: string[];
  /** Dossier par défaut sélectionné (ex: "NEW"). */
  defaultOutDirRel?: string;
}

export class ImportPreviewModal extends Modal {
  private summary: ImportSummary;
  private onConfirm: (outDirRel: string) => void | Promise<void>;
  private opts: PreviewModalOptions;

  private outDirSelect!: HTMLSelectElement;
  private selectedOutDirRel: string = "NEW";
  private confirmBtn!: HTMLButtonElement;
  private cancelBtn!: HTMLButtonElement;

  constructor(
	app: App,
	summary: ImportSummary,
	onConfirm: (outDirRel: string) => void | Promise<void>,
	opts: PreviewModalOptions
  ) {
	super(app);
	this.summary = summary;
	this.onConfirm = onConfirm;
	this.opts = opts;
	this.selectedOutDirRel = opts.defaultOutDirRel?.trim() || "NEW";
  }

  onOpen() {
	const { contentEl } = this;
	contentEl.empty();
	contentEl.addClass("import-preview-modal");

	// Titre + sous-texte
	contentEl.createEl("h2", { text: "Importer un CSV WordPress — Prévisualisation" });
	const sub = contentEl.createDiv({ cls: "import-sub" });
	sub.setText("Vérifiez le récapitulatif puis choisissez le dossier de sortie. Par défaut : NEW (même s’il n’existe pas).");

	// Sélecteur de dossier
	const selWrap = contentEl.createDiv({ cls: "outdir-select-wrap" });
	const label = selWrap.createEl("label", { text: "Dossier de sortie", attr: { for: "outdir-select" } });
	label.addClass("outdir-label");
	this.outDirSelect = selWrap.createEl("select", { attr: { id: "outdir-select", "aria-label": "Dossier de sortie" } });
	const allFolders = this.prepareFolderList(this.opts.folderListRel, this.selectedOutDirRel);
	for (const rel of allFolders) {
	  const opt = this.outDirSelect.createEl("option", { text: rel, value: rel });
	  if (rel === this.selectedOutDirRel) opt.selected = true;
	}
	this.outDirSelect.addEventListener("change", () => {
	  this.selectedOutDirRel = this.outDirSelect.value;
	});

	// Ligne de séparation
	contentEl.createEl("hr").addClass("import-hr");

	// Récap en chips
	const chips = contentEl.createDiv({ cls: "chips-row" });
	chips.appendChild(this.makeChip(`+${this.summary.created}`, "created", "Créés"));
	chips.appendChild(this.makeChip(`−${this.summary.updated}`, "updated", "Mises à jour"));
	chips.appendChild(this.makeChip(`✖${this.summary.errors}`, "errors", "Erreurs"));

	// Total = créés + MAJ + erreurs
	const total = (this.summary.created ?? 0) + (this.summary.updated ?? 0) + (this.summary.errors ?? 0);

	// Petit rappel texte (lisible)
	const recap = contentEl.createDiv({ cls: "recap-grid" });
	recap.createEl("div", { text: `Nombre d'entrées CSV : ${total} (créés + MAJ + erreurs)` }); // ← ligne demandée
	recap.createEl("div", { text: `Notes à créer : ${this.summary.created}` });
	recap.createEl("div", { text: `Notes à mettre à jour : ${this.summary.updated}` });
	recap.createEl("div", { text: `Erreurs détectées : ${this.summary.errors}` });

	// Boutons
	const btns = contentEl.createDiv({ cls: "modal-button-container" });
	this.cancelBtn = btns.createEl("button", { text: "Annuler" });
	this.cancelBtn.addEventListener("click", () => this.close());

	this.confirmBtn = btns.createEl("button", { text: "Mettre à jour" });
	this.confirmBtn.addClass("mod-cta");
	this.confirmBtn.addEventListener("click", async () => {
	  try {
		await this.onConfirm(this.selectedOutDirRel);
	  } finally {
		this.close();
	  }
	});

	// Raccourcis: Enter = confirmer, Esc = fermer
	this.registerDomEvent(window, "keydown", (ev: KeyboardEvent) => {
	  const tag = (document.activeElement?.tagName || "").toLowerCase();
	  if (ev.key === "Escape") {
		ev.preventDefault();
		this.close();
	  } else if (ev.key === "Enter" && tag !== "select") {
		// Enter valide (sauf si focus sur le <select>)
		ev.preventDefault();
		this.confirmBtn?.click();
	  }
	});

	// Styles
	this.injectStyles();
  }

  onClose() {
	this.contentEl.empty();
  }

  /* Helpers UI */

  private prepareFolderList(existing: string[], defaultRel: string): string[] {
	const set = new Set<string>(
	  existing.map(s => s.replace(/^[\/\\]+|[\/\\]+$/g, "")).filter(Boolean)
	);
	// Toujours proposer NEW
	if (!set.has("NEW")) set.add("NEW");
	// S’assurer que le défaut figure dans la liste
	if (defaultRel && !set.has(defaultRel)) set.add(defaultRel);
	return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  private makeChip(text: string, variant: "created" | "updated" | "errors", title: string): HTMLElement {
	const chip = document.createElement("div");
	chip.className = `chip chip-${variant}`;
	chip.textContent = text;
	chip.title = title;
	return chip;
  }

  private injectStyles(): void {
	const style = document.createElement("style");
	style.textContent = `
	  .import-preview-modal h2 { margin: 0 0 6px; }
	  .import-preview-modal .import-sub { color: var(--text-muted); font-size: 12px; margin-bottom: 12px; }

	  .import-preview-modal .outdir-select-wrap {
		display: grid; grid-template-columns: 140px 1fr; gap: 8px;
		align-items: center; margin: 8px 0 8px;
	  }
	  .import-preview-modal .outdir-label { font-weight: 600; }
	  .import-preview-modal #outdir-select { width: 100%; }

	  .import-preview-modal .import-hr {
		margin: 10px 0 12px; border: none; height: 1px;
		background: var(--background-modifier-border);
	  }

	  .import-preview-modal .chips-row {
		display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;
	  }
	  .import-preview-modal .chip {
		display: inline-flex; align-items: center; padding: 4px 10px;
		border-radius: 999px; font-weight: 600; font-size: 12px;
		border: 1px solid var(--background-modifier-border);
		background: var(--background-secondary);
	  }
	  .import-preview-modal .chip-created { color: var(--text-normal); border-color: var(--interactive-accent); }
	  .import-preview-modal .chip-updated { color: var(--text-normal); }
	  .import-preview-modal .chip-errors  { color: var(--text-error, #d13438); border-color: var(--text-error, #d13438); }

	  .import-preview-modal .recap-grid {
		display: grid; gap: 4px; margin-bottom: 12px;
	  }

	  .import-preview-modal .modal-button-container {
		display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;
	  }
	`;
	this.contentEl.appendChild(style);
  }
}
