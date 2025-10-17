// src/modals/tagsDiffModal.ts (v2)
// Modale de diff — 7 groupes : nouveaux tags, id update, name update, count update,
// tags à créer (info), tags à modifier (info), problèmes (info)

import type { App } from "obsidian";
import { Modal, Setting } from "obsidian";
import type { DiffItem, DiffKind } from "../services/tagsDiff";

/* ============================== Types =============================== */

export interface TagsDiffModel {
  /** Items de diff (7 groupes) */
  items: DiffItem[];
  /** Titre de la fenêtre (optionnel) */
  dialogTitle?: string;
  /** Nom du CSV appliqué (affiché en pied de modale) */
  csvName?: string;
}

export interface TagsDiffResult {
  /** Clés d’items sélectionnés à appliquer (groupes actionnables uniquement) */
  applyKeys: string[];
}

/* ============================ Public API ============================ */

export function openTagsDiffModal(app: App, model: TagsDiffModel): Promise<TagsDiffResult | null> {
  return new Promise<TagsDiffResult | null>((resolve) => {
	const m = new TagsDiffModal(app, model, resolve);
	m.open();
  });
}

/* ========================= Implémentation UI ======================== */

const ORDER: DiffKind[] = [
  "nouveaux tags",
  "id update",
  "name update",
  "count update",
  "tags à créer",
  "tags à modifier",
  "problèmes",
];

const ACTIONABLE: Set<DiffKind> = new Set([
  "nouveaux tags",
  "id update",
  "name update",
  "count update",
]);

class TagsDiffModal extends Modal {
  private model: TagsDiffModel;
  private done: (r: TagsDiffResult | null) => void;

  private checks: Map<string, boolean> = new Map(); // key -> checked

  constructor(app: App, model: TagsDiffModel, done: (r: TagsDiffResult | null) => void) {
	super(app);
	this.model = model;
	this.done = done;

	for (const it of model.items ?? []) {
	  // cochage initial fourni par le builder (true pour actionnables, false sinon)
	  this.checks.set(it.key, !!it.checked);
	}
  }

  onOpen(): void {
	const { contentEl } = this;

	this.titleEl.setText(
	  this.model.dialogTitle ?? "Mettre à jour la table des tags (WP → Obsidian)"
	);

	const items = this.model.items ?? [];
	const byKind = groupByKind(items);

	for (const kind of ORDER) {
	  const arr = byKind[kind];
	  if (!arr || arr.length === 0) continue;

	  const section = contentEl.createDiv();
	  section.createEl("h3", { text: `${labelFor(kind)} (${arr.length})` });

	  const canToggle = ACTIONABLE.has(kind);
	  for (const it of arr) this.renderItem(section, it, canToggle);
	}

	if (this.model.csvName) {
	  const hint = contentEl.createDiv({ cls: "setting-item-description" });
	  hint.setText(`CSV utilisé : ${this.model.csvName}`);
	}

	const footer = contentEl.createDiv({ cls: "modal-button-container" });
	const btnCancel = footer.createEl("button", { text: "Annuler" });
	const btnApply = footer.createEl("button", { text: "Appliquer", cls: "mod-cta" });

	btnCancel.addEventListener("click", () => this.closeWith(null));
	btnApply.addEventListener("click", () => {
	  const applyKeys: string[] = [];
	  for (const it of items) {
		if (!ACTIONABLE.has(it.kind)) continue; // info seule
		if (this.checks.get(it.key)) applyKeys.push(it.key);
	  }
	  this.closeWith({ applyKeys });
	});
  }

  onClose(): void {
	this.contentEl.empty();
  }

  /* --------------------------- UI helpers --------------------------- */

  private renderItem(container: HTMLElement, it: DiffItem, canToggle: boolean): void {
	const st = new Setting(container);

	// Titre compact
	const label = this.buildCompactLabel(it);
	st.setName(label);

	// Description: Avant (local) → Après (appliqué) + CSV + note
	const frag = document.createDocumentFragment();

	const beforeStr = it.before ? formatRow(it.before) : "(absent)";
	const afterStr = it.after ? formatRow(it.after) : "(inchangé)";
	const csvStr = it.csv
	  ? formatCsvRow({ id: it.csv.id, slug: it.csv.slug, name: it.csv.name, count: it.csv.count })
	  : null;

	const beforeEl = document.createElement("div");
	beforeEl.style.opacity = "0.8";
	beforeEl.textContent = `Avant (local): ${beforeStr}`;
	frag.appendChild(beforeEl);

	if (ACTIONABLE.has(it.kind)) {
	  const afterEl = document.createElement("div");
	  afterEl.textContent = `Après (appliqué): ${afterStr}`;
	  frag.appendChild(afterEl);
	}

	if (csvStr) {
	  const csvEl = document.createElement("div");
	  csvEl.style.marginTop = "2px";
	  csvEl.textContent = `Depuis CSV: ${csvStr}`;
	  frag.appendChild(csvEl);
	}

	if (it.note) {
	  const noteEl = document.createElement("div");
	  noteEl.style.marginTop = "4px";
	  noteEl.style.fontStyle = "italic";
	  noteEl.textContent = it.note;
	  frag.appendChild(noteEl);
	}

	st.setDesc(frag);

	if (canToggle) {
	  st.addToggle((tg) => {
		tg.setValue(this.checks.get(it.key) ?? true).onChange((v) => {
		  this.checks.set(it.key, v);
		});
	  });
	} else {
	  // lecture seule
	  const badge = st.controlEl.createEl("span", { text: "Lecture seule", cls: "u-pop" });
	  badge.style.marginLeft = "8px";
	  badge.style.opacity = "0.7";
	}
  }

  private buildCompactLabel(it: DiffItem): string {
	const slug = it.after?.slug ?? it.before?.slug ?? it.csv?.slug;
	const id =
	  (it.after?.id as number | undefined) ??
	  (it.before?.id as number | undefined) ??
	  (typeof it.csv?.id === "number" ? (it.csv.id as number) : undefined);
	if (slug && id != null) return `${it.kind}: ${slug} (id=${id})`;
	if (slug) return `${it.kind}: ${slug}`;
	if (id != null) return `${it.kind}: id=${id}`;
	return `${it.kind}: ${it.key}`;
  }

  private closeWith(result: TagsDiffResult | null): void {
	this.close();
	this.done(result);
  }
}

/* ============================== utils =============================== */

function groupByKind(items: DiffItem[]): Record<DiffKind, DiffItem[]> {
  const out = {
	"nouveaux tags": [] as DiffItem[],
	"id update": [] as DiffItem[],
	"name update": [] as DiffItem[],
	"count update": [] as DiffItem[],
	"tags à créer": [] as DiffItem[],
	"tags à modifier": [] as DiffItem[],
	"problèmes": [] as DiffItem[],
  };
  for (const it of items) out[it.kind].push(it);
  return out;
}

function labelFor(k: DiffKind): string {
  switch (k) {
	case "nouveaux tags":
	  return "Nouveaux tags";
	case "id update":
	  return "ID update";
	case "name update":
	  return "Name update";
	case "count update":
	  return "Count update";
	case "tags à créer":
	  return "Tags à créer (info seule)";
	case "tags à modifier":
	  return "Tags à modifier (info seule)";
	case "problèmes":
	  return "Problèmes (info seule)";
  }
}

function formatRow(r: { id?: number; name?: string; slug?: string; count?: number }): string {
  const id = r.id != null ? `id=${r.id}` : "id=∅";
  const slug = r.slug ? `slug=${r.slug}` : "slug=∅";
  const name = r.name ? `name="${(r.name ?? "").trim()}"` : `name=""`;
  const count =
	typeof r.count === "number" && Number.isFinite(r.count)
	  ? `count=${Math.trunc(r.count)}`
	  : "count=0";
  return `${id}; ${slug}; ${name}; ${count}`;
}

function formatCsvRow(r: { id?: unknown; name?: unknown; slug?: unknown; count?: unknown }): string {
  const id =
	typeof r.id === "number" && Number.isFinite(r.id) ? `id=${Math.trunc(r.id)}` : "id=∅";
  const slug = r.slug ? `slug=${String(r.slug).trim().toLowerCase()}` : "slug=∅";
  const name = r.name ? `name="${String(r.name).trim()}"` : `name=""`;
  const n =
	typeof r.count === "number" && Number.isFinite(r.count)
	  ? `count=${Math.trunc(r.count)}`
	  : "count=0";
  return `${id}; ${slug}; ${name}; ${n}`;
}
