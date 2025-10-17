// src/ui/previewModal.ts
// Modale de prévisualisation de l'import (affiche les comptes issus du dry-run).

import { App, Modal } from "obsidian";
import type { ImportSummary } from "@core/types";

export class ImportPreviewModal extends Modal {
  constructor(
	app: App,
	private summary: ImportSummary,
	private onConfirm: () => Promise<void>,
	private onCancel?: () => void
  ) {
	super(app);
  }

  onOpen() {
	const { contentEl } = this;
	contentEl.empty();

	// Titre
	const title = contentEl.createEl("h2", {
	  text: "Importer un CSV WordPress — Prévisualisation",
	});

	// Résumé simple
	const wrap = contentEl.createDiv();
	wrap.createEl("p", {
	  text: `Notes à créer : ${this.summary.created}`,
	});
	wrap.createEl("p", {
	  text: `Notes à mettre à jour : ${this.summary.updated}`,
	});
	if (this.summary.errors > 0) {
	  const p = wrap.createEl("p", {
		text: `Erreurs détectées : ${this.summary.errors}`,
	  });
	  p.style.color = "var(--text-error)";
	}

	// Boutons
	const btns = contentEl.createDiv({ cls: "modal-button-container" });

	const cancelBtn = btns.createEl("button", { text: "Annuler" });
	cancelBtn.addEventListener("click", () => {
	  try { this.onCancel?.(); } finally { this.close(); }
	});

	const confirmBtn = btns.createEl("button", { text: "Mettre à jour" });
	confirmBtn.addClass("mod-cta"); // bouton primaire
	confirmBtn.addEventListener("click", async () => {
	  confirmBtn.setAttr("disabled", "true");
	  cancelBtn.setAttr("disabled", "true");
	  try {
		await this.onConfirm();
	  } finally {
		this.close();
	  }
	});
  }

  onClose() {
	this.contentEl.empty();
  }
}
