// src/modals/tagsSelectModal.ts
// Modale "Tags" avec (1) saisie + autocomplétion sur une liste de slugs autorisés,
// et (2) zone de "chips" supprimables représentant les tags sélectionnés.
//
// Usage typique :
//   const modal = new TagsSelectModal(app, { allowed: slugs, initial: currentTags });
//   const result = await modal.openAndGetSelection(); // -> string[] | null
//
// - La sélection finale conserve l'ordre initial (initial) et ajoute les nouveaux tags en fin.
// - Déduplication stricte (insensible à la casse pour l'ajout, mais la valeur stockée est la forme canonique "allowed").
// - Si l'utilisateur annule, renvoie null.

import { App, Modal } from "obsidian";

export interface TagsSelectOptions {
  /** Liste complète des slugs autorisés (forme canonique). */
  allowed: string[];
  /** Tags déjà présents sur la note (pré-cochés / pré-chips). */
  initial?: string[];
  /** Message d'info si la table des tags est indisponible. Si fourni, on désactive l'input. */
  disabledInfo?: string | null;
  /** Titre de la modale (optionnel). */
  title?: string;
  /** Libellés boutons (optionnel). */
  labels?: { cancel?: string; save?: string; inputPlaceholder?: string };
}

export class TagsSelectModal extends Modal {
  private allowed: string[];
  private initial: string[];
  private disabledInfo: string | null;
  private titleText: string;
  private labels: Required<TagsSelectOptions["labels"]>;

  private resolve!: (value: string[] | null) => void;
  private promise: Promise<string[] | null>;

  private inputEl!: HTMLInputElement;
  private suggestWrap!: HTMLDivElement;
  private chipsWrap!: HTMLDivElement;

  private selected: string[] = []; // ordre final à renvoyer
  private selectedSet = new Set<string>(); // pour O(1) contains (forme canonique)

  constructor(app: App, opts: TagsSelectOptions) {
	super(app);
	this.allowed = Array.from(new Set((opts.allowed ?? []).map(s => s.trim()).filter(Boolean)));
	this.initial = Array.from(new Set((opts.initial ?? []).map(s => s.trim()).filter(Boolean)));
	this.disabledInfo = opts.disabledInfo ?? null;
	this.titleText = opts.title ?? "Modifier les tags";
	this.labels = {
	  cancel: opts.labels?.cancel ?? "Annuler",
	  save: opts.labels?.save ?? "Enregistrer",
	  inputPlaceholder: opts.labels?.inputPlaceholder ?? "Ajouter un tag…",
	};

	// state initial
	for (const t of this.initial) {
	  const canon = this.canonicalize(t);
	  if (!canon) continue;
	  if (this.selectedSet.has(canon)) continue;
	  this.selectedSet.add(canon);
	  this.selected.push(canon);
	}

	this.promise = new Promise<string[] | null>((res) => (this.resolve = res));
  }

  /** Ouvre la modale et renvoie la sélection finale (ou null si annulé). */
  openAndGetSelection(): Promise<string[] | null> {
	this.open();
	return this.promise;
  }

  // ————————————————— UI —————————————————

  onOpen(): void {
	const { contentEl } = this;
	contentEl.empty();
	contentEl.addClass("tags-select-modal");

	contentEl.createEl("h2", { text: this.titleText });

	// Champ de saisie (désactivé si pas de table)
	const inputRow = contentEl.createDiv({ cls: "tags-select-input-row" });
	this.inputEl = inputRow.createEl("input", {
	  type: "text",
	  placeholder: this.labels.inputPlaceholder,
	});
	this.inputEl.addClass("tags-select-input");

	if (this.disabledInfo) {
	  this.inputEl.setAttr("disabled", "true");
	  const warn = inputRow.createEl("div", { text: this.disabledInfo });
	  warn.addClass("mod-warning");
	  warn.setCssStyles({ marginTop: "6px", fontSize: "12px" });
	}

	// Suggestions
	this.suggestWrap = contentEl.createDiv({ cls: "tags-select-suggest" });

	// Zone chips (tags sélectionnés)
	contentEl.createEl("h3", { text: "Tags sélectionnés" });
	this.chipsWrap = contentEl.createDiv({ cls: "tags-select-chips" });

	// Boutons
	const btns = contentEl.createDiv({ cls: "modal-button-container" });
	const cancelBtn = btns.createEl("button", { text: this.labels.cancel });
	cancelBtn.addEventListener("click", () => this.finish(null));

	const saveBtn = btns.createEl("button", { text: this.labels.save });
	saveBtn.addClass("mod-cta");
	saveBtn.addEventListener("click", () => this.finish([...this.selected]));

	// Handlers
	if (!this.disabledInfo) {
	  this.inputEl.addEventListener("input", () => this.refreshSuggestions());
	  this.inputEl.addEventListener("keydown", (ev) => {
		if (ev.key === "Enter") {
		  ev.preventDefault();
		  this.addFromInputOrTop();
		}
	  });
	  // focus à l'ouverture
	  window.setTimeout(() => this.inputEl.focus(), 0);
	}

	// premier rendu
	this.refreshChips();
	this.refreshSuggestions();
	this.injectStyles();
  }

  onClose(): void {
	this.contentEl.empty();
	// si l'utilisateur ferme la fenêtre par la croix, on renvoie null
	if (this.resolve) this.resolve(null);
  }

  // ————————————————— Logic —————————————————

  /** Ajoute l'item correspondant à la saisie ou, à défaut, la 1ʳᵉ suggestion. */
  private addFromInputOrTop(): void {
	const raw = this.inputEl.value.trim();
	if (!raw) return;

	// Cherche correspondance exacte (insensitive)
	const canon = this.canonicalize(raw);
	if (canon) {
	  this.addTag(canon);
	  this.inputEl.value = "";
	  this.refreshSuggestions();
	  return;
	}

	// Sinon, prend la 1ère suggestion si présente
	const top = this.suggestWrap.querySelector<HTMLDivElement>(".tag-suggest-item");
	if (top && top.dataset.slug) {
	  this.addTag(top.dataset.slug);
	  this.inputEl.value = "";
	  this.refreshSuggestions();
	}
  }

  /** Ajoute un tag (forme canonique), si pas déjà présent. */
  private addTag(slug: string): void {
	if (!slug) return;
	if (this.selectedSet.has(slug)) return;
	this.selectedSet.add(slug);
	this.selected.push(slug);
	this.refreshChips();
  }

  /** Retire un tag déjà sélectionné. */
  private removeTag(slug: string): void {
	if (!this.selectedSet.has(slug)) return;
	this.selectedSet.delete(slug);
	const idx = this.selected.indexOf(slug);
	if (idx >= 0) this.selected.splice(idx, 1);
	this.refreshChips();
  }

  /** Transforme une saisie utilisateur en slug canonique si présent dans `allowed` (insensible à la casse). */
  private canonicalize(input: string): string | null {
	const q = input.trim().toLowerCase();
	if (!q) return null;
	// match exact d'abord
	for (const s of this.allowed) if (s.toLowerCase() === q) return s;
	return null;
  }

  /** Filtres fuzzy simples (contient tous les caractères dans l'ordre) */
  private fuzzyFilter(query: string): string[] {
	const q = query.trim().toLowerCase();
	if (!q) {
	  // propose les 12 premiers non sélectionnés
	  return this.allowed.filter(s => !this.selectedSet.has(s)).slice(0, 12);
	}
	const scored: Array<{ s: string; score: number }> = [];
	for (const s of this.allowed) {
	  if (this.selectedSet.has(s)) continue;
	  const t = s.toLowerCase();
	  const sc = fuzzyScore(q, t);
	  if (sc > 0) scored.push({ s, score: sc });
	}
	scored.sort((a, b) => b.score - a.score || a.s.localeCompare(b.s));
	return scored.slice(0, 12).map(x => x.s);
  }

  private refreshSuggestions(): void {
	const q = this.inputEl?.value ?? "";
	const sugg = this.fuzzyFilter(q);
	this.suggestWrap.empty();
	if (!sugg.length) {
	  if (q.trim().length > 0) {
		const none = this.suggestWrap.createEl("div", { text: "Aucune suggestion", cls: "tag-suggest-none" });
		none.setCssStyles({ opacity: "0.7" });
	  }
	  return;
	}
	for (const s of sugg) {
	  const row = this.suggestWrap.createDiv({ cls: "tag-suggest-item" });
	  row.setText(s);
	  row.dataset.slug = s;
	  row.addEventListener("click", () => {
		this.addTag(s);
		this.inputEl.value = "";
		this.refreshSuggestions();
	  });
	}
  }

  private refreshChips(): void {
	this.chipsWrap.empty();
	if (!this.selected.length) {
	  const hint = this.chipsWrap.createEl("div", { text: "Aucun tag sélectionné pour l’instant." });
	  hint.setCssStyles({ opacity: "0.7", fontSize: "12px" });
	  return;
	}
	const list = this.chipsWrap.createDiv({ cls: "chips-list" });
	for (const s of this.selected) {
	  const chip = list.createDiv({ cls: "chip" });
	  chip.createSpan({ text: s });
	  const x = chip.createSpan({ text: "×", cls: "chip-remove" });
	  x.setAttr("aria-label", `Supprimer ${s}`);
	  x.addEventListener("click", () => this.removeTag(s));
	}
  }

  /** Ferme la modale en renvoyant la valeur. */
  private finish(value: string[] | null): void {
	const res = this.resolve;
	// Evite double resolve si onClose() est appelé après
	this.resolve = () => {};
	res(value);
	this.close();
  }

  // ————————————————— Styles minimaux —————————————————

  private injectStyles(): void {
	const root = this.contentEl;
	root.querySelectorAll<HTMLElement>(".tags-select-input").forEach(el => {
	  el.style.width = "100%";
	  el.style.boxSizing = "border-box";
	  el.style.marginBottom = "8px";
	});
	root.querySelectorAll<HTMLElement>(".tags-select-suggest").forEach(el => {
	  el.style.maxHeight = "220px";
	  el.style.overflowY = "auto";
	  el.style.border = "1px solid var(--background-modifier-border)";
	  el.style.borderRadius = "6px";
	  el.style.padding = "6px";
	  el.style.marginBottom = "12px";
	});
	root.querySelectorAll<HTMLElement>(".tag-suggest-item").forEach(el => {
	  el.style.padding = "6px 8px";
	  el.style.cursor = "pointer";
	});
	// Delegation pour hover (appliquée aux futurs items)
	this.suggestWrap.addEventListener("mouseover", (e) => {
	  const t = (e.target as HTMLElement);
	  if (t && t.classList.contains("tag-suggest-item")) {
		t.style.background = "var(--background-modifier-hover)";
		t.style.borderRadius = "4px";
	  }
	}, { passive: true });
	this.suggestWrap.addEventListener("mouseout", (e) => {
	  const t = (e.target as HTMLElement);
	  if (t && t.classList.contains("tag-suggest-item")) {
		t.style.background = "transparent";
	  }
	}, { passive: true });

	root.querySelectorAll<HTMLElement>(".chips-list").forEach(el => {
	  el.style.display = "flex";
	  el.style.flexWrap = "wrap";
	  el.style.gap = "6px";
	});
	// style chips via CSS inline minimal
	const style = document.createElement("style");
	style.textContent = `
	  .tags-select-modal .chip {
		display:inline-flex; align-items:center; gap:6px;
		padding:3px 8px; border-radius:12px;
		background: var(--background-modifier-border);
		font-size: 12px;
	  }
	  .tags-select-modal .chip-remove {
		cursor: pointer; opacity: .8;
		padding: 0 2px;
	  }
	  .tags-select-modal .chip-remove:hover { opacity: 1; }
	`;
	root.appendChild(style);
  }
}

/* ───────────────────────────── fuzzy scoring ─────────────────────────────
   Score simple : +3 si préfixe, +2 si sous-chaîne contiguë, +1 si subsequence,
   bonus longueur courte. Retourne 0 si aucun match.
────────────────────────────────────────────────────────────────────────── */
function fuzzyScore(q: string, t: string): number {
  if (!q) return 1;
  if (t.startsWith(q)) return 300 - t.length;      // préfixe
  if (t.includes(q)) return 200 - (t.indexOf(q) + t.length); // sous-chaîne
  // subsequence
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  if (i === q.length) return 100 - t.length;
  return 0;
}
