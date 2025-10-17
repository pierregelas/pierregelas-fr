// src/modals/archivesDiffModal.ts
// Implémentation — Modale de diff Futur (Archives/Restes)
// Objectif: afficher les différences et renvoyer la liste des clés à appliquer + éventuel rename.

import type { App } from "obsidian";
import { Modal, Setting } from "obsidian";

/** Valeur d’un champ YAML pris en charge (chaîne ou liste de chaînes). */
export type DiffValue = string | string[];

/** Groupe de la diff : A = commun (toujours proposé), B = dérivés (si titre changé). */
export type DiffGroup = "A" | "B";

/** Élément de diff: une clé YAML + ancienne/nouvelle valeur. */
export interface DiffItem {
  key: string;          // ex: "post_date", "tags", "post_titre_1", "img_filename", ...
  label: string;        // ex: "Date du post", "Tags", "Titre 1 (…)", ...
  before: DiffValue;    // valeur actuelle (cible)
  after: DiffValue;     // valeur à appliquer (source/dérivation)
  group: DiffGroup;     // "A" ou "B"
  checked?: boolean;    // coché par défaut ?
}

/** Modèle de diff: liste d’items, + renommage proposé et titre optionnel. */
export interface DiffModel {
  items: DiffItem[];
  /** Si défini: nom de fichier cible proposé (rename du .md, sans extension) */
  suggestedRename?: string;
  /** Titre de la fenêtre. Défaut: "Mettre à jour la note « Archives du futur »" */
  dialogTitle?: string;
}

/** Résultat: clés cochées à appliquer, et éventuel rename choisi. */
export interface DiffResult {
  applyKeys: string[];
  renameTo?: string; // si défini, renommer la note cible vers ce nom (sans .md)
}

/**
 * Ouvre la modale de diff et renvoie les choix de l’utilisateur.
 * - Retourne `null` si Annuler.
 * - Ne réalise aucune mise à jour: le caller applique les changements.
 */
export function openArchivesDiffModal(app: App, model: DiffModel): Promise<DiffResult | null> {
  return new Promise<DiffResult | null>((resolve) => {
	const modal = new ArchivesDiffModal(app, model, resolve);
	modal.open();
  });
}

/* -------------------- Implémentation -------------------- */

class ArchivesDiffModal extends Modal {
  private model: DiffModel;
  private done: (result: DiffResult | null) => void;

  private checks: Map<string, boolean> = new Map(); // clé YAML -> bool
  private chosenRename: string | undefined;
  private renameEnabled = true;

  constructor(app: App, model: DiffModel, done: (result: DiffResult | null) => void) {
	super(app);
	this.model = model;
	this.done = done;

	for (const it of model.items ?? []) {
	  this.checks.set(it.key, it.checked ?? true);
	}
	this.chosenRename = model.suggestedRename;
  }

  onOpen(): void {
	const { contentEl } = this;

	this.titleEl.setText(this.model.dialogTitle ?? "Mettre à jour la note « Archives du futur »");

	const aItems = this.model.items.filter((i) => i.group === "A");
	const bItems = this.model.items.filter((i) => i.group === "B");

	if (aItems.length) {
	  const sectionA = contentEl.createDiv();
	  sectionA.createEl("h3", { text: "Champs communs (A)" });
	  for (const it of aItems) this.renderItem(sectionA, it);
	}

	if (bItems.length) {
	  const sectionB = contentEl.createDiv();
	  sectionB.createEl("h3", { text: "Titres & dérivés (B)" });
	  for (const it of bItems) this.renderItem(sectionB, it);
	}

	if (this.model.suggestedRename) {
	  new Setting(contentEl)
		.setName("Renommer la note")
		.setDesc("Nom de fichier cible (sans extension .md)")
		.addText((txt) => {
		  txt.setPlaceholder(this.model.suggestedRename!)
			.setValue(this.model.suggestedRename!)
			.onChange((v) => (this.chosenRename = v.trim() || this.model.suggestedRename));
		})
		.addToggle((tg) => {
		  tg.setValue(true).onChange((v) => (this.renameEnabled = v));
		});
	}

	const footer = contentEl.createDiv({ cls: "modal-button-container" });
	const btnCancel = footer.createEl("button", { text: "Annuler" });
	const btnApply = footer.createEl("button", { text: "Mettre à jour", cls: "mod-cta" });

	btnCancel.addEventListener("click", () => this.closeWith(null));
	btnApply.addEventListener("click", () => {
	  const applyKeys: string[] = [];
	  for (const it of this.model.items) {
		if (this.checks.get(it.key)) applyKeys.push(it.key);
	  }
	  const result: DiffResult = {
		applyKeys,
		renameTo: this.model.suggestedRename && this.renameEnabled
		  ? (this.chosenRename?.trim() || this.model.suggestedRename)
		  : undefined,
	  };
	  this.closeWith(result);
	});
  }

  onClose(): void {
	this.contentEl.empty();
  }

  /* ---------- UI helpers ---------- */

  private renderItem(container: HTMLElement, it: DiffItem): void {
	const st = new Setting(container).setName(it.label);

	const desc = document.createDocumentFragment();
	const beforeEl = document.createElement("div");
	beforeEl.style.opacity = "0.8";
	beforeEl.textContent = `Avant: ${this.formatValue(it.before)}`;
	const afterEl = document.createElement("div");
	afterEl.textContent = `Après: ${this.formatValue(it.after)}`;
	desc.appendChild(beforeEl);
	desc.appendChild(afterEl);
	st.setDesc(desc);

	st.addToggle((tg) => {
	  tg.setValue(this.checks.get(it.key) ?? true).onChange((v) => {
		this.checks.set(it.key, v);
	  });
	});
  }

  private formatValue(v: DiffValue): string {
	if (Array.isArray(v)) return v.map((x) => `"${x}"`).join(", ");
	return v ? `"${v}"` : "(vide)";
  }

  private closeWith(result: DiffResult | null): void {
	this.close();
	this.done(result);
  }
}
