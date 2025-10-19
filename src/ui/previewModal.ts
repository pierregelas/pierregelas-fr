// src/ui/previewModal.ts
// Modale de prévisualisation d'import CSV WordPress
// Améliorations visuelles : libellés, espacements, chips récap (+n/−m/✖e), Enter/Esc.
// Ajout : total hors en-tête + breakdown des MAJ (identiques / modifiées)
// AJOUT 2025-10-19 : Anti-régression CSV (Famille/ID) — blocage si CSV plus ancien pour la même famille.

import { App, Modal } from "obsidian";
import type { ImportSummary } from "@core/types";
import { parseCsvNameV2 } from "@core/csvMeta";
import { findLatestImportId, isRegression } from "@core/importGuard";

export interface PreviewModalOptions {
  folderListRel: string[];
  defaultOutDirRel?: string;
  /** Nom du CSV v2 sélectionné: "<dataset_key>_<YYYYMMDD>_PG.csv" */
  csvFileName?: string;
}

export class ImportPreviewModal extends Modal {
  private summary: ImportSummary;
  private onConfirm: (outDirRel: string) => void | Promise<void>;
  private opts: PreviewModalOptions;

  private outDirSelect!: HTMLSelectElement;
  private selectedOutDirRel: string = "NEW";
  private confirmBtn!: HTMLButtonElement;

  // Anti-régression CSV (famille/ID)
  private datasetKey?: string;
  private datasetId?: number;
  private latestId?: number;
  private blocked: boolean = false;

  constructor(app: App, summary: ImportSummary, onConfirm: (outDirRel: string) => void | Promise<void>, opts: PreviewModalOptions) {
	super(app);
	this.summary = summary;
	this.onConfirm = onConfirm;
	this.opts = opts;
	this.selectedOutDirRel = opts.defaultOutDirRel?.trim() || "NEW";
  }

  async onOpen() {
	const { contentEl } = this;
	contentEl.empty();
	contentEl.addClass("import-preview-modal");

	contentEl.createEl("h2", { text: "Importer un CSV WordPress — Prévisualisation" });
	const sub = contentEl.createDiv({ cls: "import-sub" });
	sub.setText("Vérifiez le récapitulatif puis choisissez le dossier de sortie. Par défaut : NEW (même s’il n’existe pas).");

	// Sélecteur de dossier de sortie
	const selWrap = contentEl.createDiv({ cls: "outdir-select-wrap" });
	selWrap.createEl("label", { text: "Dossier de sortie" });
	this.outDirSelect = selWrap.createEl("select", { attr: { id: "outdir-select" } });
	for (const rel of this.opts.folderListRel) {
	  const opt = this.outDirSelect.createEl("option", { text: rel, value: rel });
	  if (rel === this.selectedOutDirRel) opt.selected = true;
	}
	this.outDirSelect.addEventListener("change", () => {
	  this.selectedOutDirRel = this.outDirSelect.value;
	});

	contentEl.createEl("hr").addClass("import-hr");

	// ── En-tête CSV (Famille/ID) + contrôle anti-régression ─────────────────────
	this.renderHeaderCsvMeta({ info: "Analyse du CSV…" });
	const csvName = this.opts.csvFileName?.trim();
	if (csvName) {
	  try {
		const parsed = parseCsvNameV2(csvName);
		this.datasetKey = parsed.datasetKey;
		this.datasetId = parsed.datasetId;
		const { latestId } = await findLatestImportId(this.app, parsed.datasetKey);
		this.latestId = latestId;
		this.blocked = isRegression(this.datasetId, this.latestId);
		this.renderHeaderCsvMeta({
		  datasetKey: this.datasetKey,
		  datasetId: this.datasetId,
		  latestId: this.latestId
		});
	  } catch (e: any) {
		// Nom CSV invalide → blocage dur
		this.blocked = true;
		this.renderHeaderCsvMeta({ error: String(e?.message ?? e) });
	  }
	} else {
	  this.renderHeaderCsvMeta({ info: "Aucun CSV sélectionné." });
	}

	// Chips récap (+ créés / − maj / × erreurs)
	const chipsRow = contentEl.createDiv({ cls: "chips-row" });
	const created = safeInt(
	  (this.summary as any).createdCount ?? (this.summary as any).createCount ?? (this.summary as any).plus ?? 0
	);
	const updated = safeInt(
	  (this.summary as any).updateCount ?? (this.summary as any).minus ?? 0
	);
	const errors = safeInt(
	  (this.summary as any).errorCount ?? (this.summary as any).errors ?? 0
	);
	this.createChip(chipsRow, `+${created}`);
	this.createChip(chipsRow, `-${updated}`);
	this.createChip(chipsRow, `× ${errors}`, "chip-errors");

	// Détails chiffrés
	const recap = contentEl.createDiv({ cls: "recap-grid" });

	// Total hors en-tête
	const totalNoHeader =
	  (this.summary as any).totalCsvEntries ??
	  (this.summary as any).totalRowsNoHeader ??
	  (() => {
		const c = safeInt(created);
		const u = safeInt(updated);
		const e = safeInt(errors);
		return c + u + e;
	  })();

	recap.createEl("div", {
	  text: `Nombre d’entrées CSV (hors en-tête) : ${totalNoHeader} (créés + MAJ + erreurs)`
	});

	// Breakdown des MAJ : identiques / modifiées
	const same =
	  (this.summary as any).updateIdenticalCount ??
	  (this.summary as any).identiques ??
	  (this.summary as any).sameCount ??
	  0;

	const changed =
	  (this.summary as any).updateModifiedCount ??
	  (this.summary as any).modifiees ??
	  (this.summary as any).changedCount ??
	  Math.max(0, updated - safeInt(same));

	recap.createEl("div", { text: `Notes à créer : ${created}` });
	recap.createEl("div", { text: `Notes à mettre à jour : ${updated}` });

	// Sous-liste des MAJ
	const ul = recap.createEl("ul");
	ul.createEl("li", { text: `identiques : ${same}` });
	ul.createEl("li", { text: `modifiées : ${changed}` });

	recap.createEl("div", { text: `Erreurs détectées : ${errors}` });

	// Boutons
	const btns = contentEl.createDiv({ cls: "modal-button-container" });
	const cancelBtn = btns.createEl("button", { text: "Annuler" });
	cancelBtn.addEventListener("click", () => this.close());

	this.confirmBtn = btns.createEl("button", { text: "Mettre à jour" });
	this.confirmBtn.addClass("mod-cta");
	// Désactiver si régression / nom invalide
	this.updatePrimaryCtaDisabled(this.blocked);
	this.confirmBtn.addEventListener("click", async () => {
	  if (this.blocked) return; // Sécurité
	  try {
		await this.onConfirm(this.selectedOutDirRel);
	  } finally {
		this.close();
	  }
	});

	// Clavier: Enter = valider, Esc = fermer
	this.registerDomEvent(window, "keydown", (e: KeyboardEvent) => {
	  if (e.key === "Enter") {
		if (!this.blocked) this.confirmBtn?.click();
	  } else if (e.key === "Escape") {
		this.close();
	  }
	});

	// Styles
	this.injectStyles();
  }

  onClose() {
	const { contentEl } = this;
	contentEl.empty();
  }

  /* ───────────────────────────── UI helpers ───────────────────────────── */

  private createChip(host: HTMLElement, text: string, cls?: string) {
	const chip = host.createDiv({ cls: "chip" });
	if (cls) chip.addClass(cls);
	chip.setText(text);
	return chip;
  }

  private renderHeaderCsvMeta(opts: {
	datasetKey?: string;
	datasetId?: number;
	latestId?: number;
	error?: string;
	info?: string;
  }) {
	const host =
	  (this.contentEl.querySelector(".csv-meta-header") as HTMLElement) ||
	  this.contentEl.createDiv({ cls: "csv-meta-header" });
	host.empty();

	if (opts.error) {
	  host.createEl("div", { text: `Erreur CSV: ${opts.error}` }).addClass("mod-error");
	  // Le bouton sera désactivé quand il sera créé
	  return;
	}
	if (opts.info) {
	  host.createEl("div", { text: opts.info }).addClass("mod-info");
	}

	if (opts.datasetKey || opts.datasetId) {
	  const l1 = host.createEl("div");
	  l1.setText(
		`CSV: ${this.opts.csvFileName ?? "?"} — Famille: ${opts.datasetKey ?? "?"} — ID: ${opts.datasetId ?? "?"}`
	  );
	}
	if (typeof opts.latestId === "number") {
	  host.createEl("div", {
		text: `Dernier import connu pour cette famille: ID ${opts.latestId}`
	  });
	} else if (opts.datasetKey) {
	  host.createEl("div", {
		text: `Aucun import connu pour cette famille`
	  });
	}

	if (this.blocked) {
	  host
		.createEl("div", {
		  text: `Un import plus récent a déjà été appliqué pour « ${opts.datasetKey ?? "?"} ». Mise à jour BLOQUÉE.`
		})
		.addClass("mod-error");
	} else if (
	  typeof opts.latestId === "number" &&
	  typeof opts.datasetId === "number" &&
	  opts.latestId === opts.datasetId
	) {
	  host
		.createEl("div", { text: `Même ID que le dernier import connu (re-run autorisé).` })
		.addClass("mod-warning");
	}
  }

  private updatePrimaryCtaDisabled(disabled: boolean) {
	if (!this.confirmBtn) return;
	this.confirmBtn.disabled = !!disabled;
  }

  private injectStyles(): void {
	const style = document.createElement("style");
	style.textContent = `
	  .import-preview-modal h2 { margin: 0 0 6px; }
	  .import-preview-modal .import-sub { margin-bottom: 8px; color: var(--text-muted); }
	  .import-preview-modal .outdir-select-wrap { margin: 8px 0 8px; display: grid; gap: 4px; }
	  .import-preview-modal #outdir-select { width: 100%; }
	  .import-preview-modal .import-hr { margin: 10px 0 12px; border: none; height: 1px; background: var(--background-modifier-border); }
	  .import-preview-modal .csv-meta-header { margin: 8px 0 12px; display: grid; gap: 4px; }
	  .import-preview-modal .mod-error { color: var(--text-error, #d13438); font-weight: 600; }
	  .import-preview-modal .mod-warning { color: var(--text-warning, #c78600); }
	  .import-preview-modal .mod-info { color: var(--text-muted); }
	  .import-preview-modal .chips-row { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
	  .import-preview-modal .chip {
		display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 12px;
		border: 1px solid var(--background-modifier-border); background: var(--background-secondary);
	  }
	  .import-preview-modal .chip-errors  { color: var(--text-error, #d13438); border-color: var(--text-error, #d13438); }
	  .import-preview-modal .recap-grid { display: grid; gap: 4px; margin-bottom: 12px; }
	  .import-preview-modal .modal-button-container { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
	  .import-preview-modal .mod-cta { font-weight: 700; }
	`;
	this.contentEl.appendChild(style);
  }
}

/* ───────────────────────────── utils ───────────────────────────── */

function safeInt(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
