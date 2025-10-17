// src/services/tagsDiff.ts (v2)
// Diff CSV (WP) ↔ table locale (Obsidian) selon tes 7 groupes et tes règles.

import type { TagRow } from "./tagsCsv";
import type { LocalTagRow } from "./tagsTable";

/* ============================== Types =============================== */

export type DiffKind =
  | "nouveaux tags"
  | "id update"
  | "name update"
  | "count update"
  | "tags à créer"
  | "tags à modifier"
  | "problèmes";

export interface DiffItem {
  key: string;              // identifiant stable (ex: "name update:montagne|id=123")
  kind: DiffKind;
  before?: LocalTagRow;     // état local (si pertinent)
  after?: LocalTagRow;      // état cible locale après application (actionnables)
  csv?: TagRow;             // ligne CSV liée (pour info)
  checked?: boolean;        // coché par défaut ? (oui pour les groupes actionnables)
  note?: string;            // explication courte
}

export interface TagsDiff {
  items: DiffItem[];
  counts: Record<DiffKind, number>;
  hasActionable: boolean;   // true si au moins un des 4 groupes actionnables est présent
}

/* ============================ Public API ============================ */

/**
 * Construit la diff v2 selon TES règles (Conditions et réactions).
 * Groupes:
 * - nouveaux tags (actionnable)
 * - id update (actionnable)
 * - name update (actionnable)
 * - count update (actionnable)
 * - tags à créer (info seule)
 * - tags à modifier (info seule)
 * - problèmes (fourre-tout, info seule)
 */
export function buildTagsDiff(csvRowsIn: TagRow[], localRowsIn: LocalTagRow[]): TagsDiff {
  const items: DiffItem[] = [];

  const csvRows = [...(csvRowsIn || [])];
  const localRows = [...(localRowsIn || [])];

  const csvById = mapByIdCsv(csvRows);
  const csvBySlug = mapBySlugCsv(csvRows);

  const localById = mapByIdLocal(localRows);
  const localBySlug = mapBySlugLocal(localRows);

  const handledLocal = new Set<LocalTagRow>(); // pour éviter doublons en "problèmes"
  const handledKeys = new Set<string>();

  // ========= Parcours CSV ⇒ cas 1, 2, 3 =========
  for (const csv of csvRows) {
	const csvId = toInt(csv.id);
	const csvSlug = norm(csv.slug);

	const localExact = findLocalExact(localRows, csvId, csvSlug);
	if (localExact) {
	  handledLocal.add(localExact);

	  // 2. wp_id/wp_slug existe exactement dans la table :
	  // - update name if different → grouper name update
	  if (differsStr(localExact.name, csv.name)) {
		pushItem({
		  kind: "name update",
		  before: localExact,
		  after: { ...localExact, name: (csv.name ?? "").trim() },
		  csv,
		  checked: true,
		  note: "name différent (id/slug identiques)",
		});
	  }
	  // - update count if different → grouper count update
	  if (differsInt(localExact.count, csv.count)) {
		pushItem({
		  kind: "count update",
		  before: localExact,
		  after: { ...localExact, count: toInt(csv.count) ?? 0 },
		  csv,
		  checked: true,
		  note: "count différent (id/slug identiques)",
		});
	  }
	  continue; // passer à la ligne suivante
	}

	// 3. wp_id/wp_slug n'existe pas exactement dans la table :
	//    a) id identiques, slugs différents
	const localSameId = csvId != null ? localById.get(csvId) : undefined;
	if (localSameId && norm(localSameId.slug) !== csvSlug) {
	  handledLocal.add(localSameId);

	  if (isObm(localSameId.notes)) {
		// obm → ne rien synchroniser → tags à modifier
		pushItem({
		  kind: "tags à modifier",
		  before: localSameId,
		  csv,
		  checked: false,
		  note: "obm: modification locale (slug/name protégés)",
		});
	  } else {
		// notes vide → update slug, name, count → name update
		pushItem({
		  kind: "name update",
		  before: localSameId,
		  after: {
			...localSameId,
			slug: csvSlug,
			name: (csv.name ?? "").trim(),
			count: toInt(csv.count) ?? 0,
		  },
		  csv,
		  checked: true,
		  note: "id identique, slug différent → aligner sur CSV (slug/name/count)",
		});
	  }
	  continue;
	}

	//    b) slugs identiques, id différents
	const localSameSlug = csvSlug ? localBySlug.get(csvSlug) : undefined;
	if (localSameSlug && toInt(localSameSlug.id) !== csvId) {
	  handledLocal.add(localSameSlug);

	  if (csvId != null && toInt(localSameSlug.id) == null && isObc(localSameSlug.notes)) {
		// wp_tags_id non vide, ob_tags_id vide, notes=obc → id update
		pushItem({
		  kind: "id update",
		  before: localSameSlug,
		  after: {
			...localSameSlug,
			id: csvId,
			name: (csv.name ?? "").trim(),
			count: toInt(csv.count) ?? 0,
			notes: "", // clear notes
		  },
		  csv,
		  checked: true,
		  note: "import d'id depuis WP (obc→id rempli, name/count alignés)",
		});
	  } else {
		// non couvert → problèmes
		pushItem({
		  kind: "problèmes",
		  before: localSameSlug,
		  csv,
		  checked: false,
		  note: "slugs identiques mais ids différents (non couvert par les règles) → revue manuelle",
		});
	  }
	  continue;
	}

	// 1. wp_id/wp_slug n'existe pas du tout dans la table → nouveaux tags
	pushItem({
	  kind: "nouveaux tags",
	  after: {
		id: csvId ?? undefined,
		name: (csv.name ?? "").trim(),
		slug: csvSlug,
		count: toInt(csv.count) ?? 0,
		notes: "",
	  },
	  csv,
	  checked: true,
	  note: "entrée absente en local → ajout complet",
	});
  }

  // ========= Ajout des "tags à créer" (info seule) =========
  {
	const csvSlugs = new Set<string>(csvRows.map((r) => norm(r.slug)).filter(Boolean));
	for (const local of localRows) {
	  const slug = norm(local.slug);
	  const hasId = toInt(local.id) != null;
	  if (!hasId && isObc(local.notes) && slug && !csvSlugs.has(slug)) {
		handledLocal.add(local);
		pushItem({
		  kind: "tags à créer",
		  before: local,
		  checked: false,
		  note: "tag créé dans Obsidian (obc), absent du CSV → à créer dans WordPress",
		});
	  }
	}
  }

  // ========= Fourre-tout "problèmes" (disparités non traitées) =========
  for (const local of localRows) {
	if (handledLocal.has(local)) continue;

	const id = toInt(local.id);
	const slug = norm(local.slug);

	const csvForId = id != null ? csvById.get(id) : undefined;
	const csvForSlug = slug ? csvBySlug.get(slug) : undefined;

	// disparité ? (si strictement identique on n'affiche pas)
	const identical =
	  csvForId &&
	  csvForSlug &&
	  toInt(csvForId.id) === id &&
	  norm(csvForId.slug) === slug &&
	  (csvForId.name ?? "").trim() === (local.name ?? "").trim() &&
	  (toInt(csvForId.count) ?? 0) === (toInt(local.count) ?? 0);

	if (!identical) {
	  pushItem({
		kind: "problèmes",
		before: local,
		csv: csvForId ?? csvForSlug,
		checked: false,
		note: "disparité non couverte par les règles (revue manuelle)",
	  });
	}
  }

  // Compteurs & flag actionable
  const counts = {
	"nouveaux tags": items.filter((x) => x.kind === "nouveaux tags").length,
	"id update": items.filter((x) => x.kind === "id update").length,
	"name update": items.filter((x) => x.kind === "name update").length,
	"count update": items.filter((x) => x.kind === "count update").length,
	"tags à créer": items.filter((x) => x.kind === "tags à créer").length,
	"tags à modifier": items.filter((x) => x.kind === "tags à modifier").length,
	"problèmes": items.filter((x) => x.kind === "problèmes").length,
  } as Record<DiffKind, number>;

  const hasActionable =
	counts["nouveaux tags"] + counts["id update"] + counts["name update"] + counts["count update"] >
	0;

  return { items, counts, hasActionable };

  function pushItem(it: Omit<DiffItem, "key">) {
	const key = makeKey(it);
	if (handledKeys.has(key)) return;
	handledKeys.add(key);
	items.push({ key, ...it });
  }
}

/**
 * Applique les items sélectionnés (uniquement groupes actionnables):
 * - nouveaux tags: push after
 * - id update: maj id + name/count + clear notes
 * - name update: maj slug/name/count (ou seulement name si exact match)
 * - count update: maj count
 * (tags à créer / tags à modifier / problèmes: lecture seule)
 */
export function applyTagsDiff(localRowsIn: LocalTagRow[], apply: DiffItem[]): LocalTagRow[] {
  let out = [...(localRowsIn || [])];

  // Ordre sûr: id update → name update → count update → nouveaux tags
  for (const it of apply.filter((x) => x.kind === "id update")) {
	if (!it.before || !it.after) continue;
	const slug = norm(it.before.slug);
	const idx = out.findIndex((r) => norm(r.slug) === slug);
	if (idx >= 0) out[idx] = { ...out[idx], ...it.after };
  }

  for (const it of apply.filter((x) => x.kind === "name update")) {
	if (!it.before || !it.after) continue;
	const id = toInt(it.before.id);
	const idx =
	  id != null ? out.findIndex((r) => toInt(r.id) === id) : out.findIndex((r) => norm(r.slug) === norm(it.before!.slug));
	if (idx >= 0) out[idx] = { ...out[idx], ...it.after };
  }

  for (const it of apply.filter((x) => x.kind === "count update")) {
	if (!it.before || !it.after) continue;
	const id = toInt(it.before.id);
	const idx =
	  id != null ? out.findIndex((r) => toInt(r.id) === id) : out.findIndex((r) => norm(r.slug) === norm(it.before!.slug));
	if (idx >= 0) out[idx] = { ...out[idx], count: toInt(it.after.count) ?? 0 };
  }

  for (const it of apply.filter((x) => x.kind === "nouveaux tags")) {
	if (!it.after) continue;
	const exists =
	  (toInt(it.after.id) != null && out.some((r) => toInt(r.id) === toInt(it.after!.id))) ||
	  (norm(it.after.slug) && out.some((r) => norm(r.slug) === norm(it.after!.slug)));
	if (!exists) out.push({ ...it.after });
  }

  return out;
}

/**
 * Flag YAML: true s'il existe au moins un tag local à **créer dans WP**,
 * c.-à-d. `ob_tags_id` vide, `ob_tags_slug` absent du CSV, et `ob_tags_notes = "obc"`.
 */
export function hasLocalWithoutIdMissingInCsv(localRows: LocalTagRow[], csvRows: TagRow[]): boolean {
  const csvSlugs = new Set(csvRows.map((r) => norm(r.slug)).filter(Boolean));
  for (const r of localRows || []) {
	const hasId = toInt(r.id) != null;
	const slug = norm(r.slug);
	if (!hasId && isObc(r.notes) && slug && !csvSlugs.has(slug)) return true;
  }
  return false;
}

/* ============================ Helpers ============================ */

function mapByIdCsv(rows: TagRow[]): Map<number, TagRow> {
  const m = new Map<number, TagRow>();
  for (const r of rows || []) {
	const id = toInt(r.id);
	if (id != null && !m.has(id)) m.set(id, r);
  }
  return m;
}
function mapBySlugCsv(rows: TagRow[]): Map<string, TagRow> {
  const m = new Map<string, TagRow>();
  for (const r of rows || []) {
	const slug = norm(r.slug);
	if (slug && !m.has(slug)) m.set(slug, r);
  }
  return m;
}

function mapByIdLocal(rows: LocalTagRow[]): Map<number, LocalTagRow> {
  const m = new Map<number, LocalTagRow>();
  for (const r of rows || []) {
	const id = toInt(r.id);
	if (id != null && !m.has(id)) m.set(id, r);
  }
  return m;
}
function mapBySlugLocal(rows: LocalTagRow[]): Map<string, LocalTagRow> {
  const m = new Map<string, LocalTagRow>();
  for (const r of rows || []) {
	const slug = norm(r.slug);
	if (slug && !m.has(slug)) m.set(slug, r);
  }
  return m;
}

function findLocalExact(rows: LocalTagRow[], id: number | undefined, slug: string): LocalTagRow | undefined {
  return rows.find((r) => toInt(r.id) === id && norm(r.slug) === slug);
}

function norm(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}
function differsStr(a?: string, b?: string): boolean {
  return (a ?? "").trim() !== (b ?? "").trim();
}
function differsInt(a?: number, b?: number): boolean {
  return (toInt(a) ?? 0) !== (toInt(b) ?? 0);
}
function toInt(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}
function isObc(notes?: string): boolean {
  return (notes ?? "").trim().toLowerCase() === "obc";
}
function isObm(notes?: string): boolean {
  return (notes ?? "").trim().toLowerCase() === "obm";
}

function makeKey(it: Omit<DiffItem, "key">): string {
  const k = it.kind;
  const id = toInt(it.before?.id ?? it.after?.id);
  const slug = norm(it.before?.slug ?? it.after?.slug ?? it.csv?.slug);
  return `${k}:${slug || "∅"}|id=${id ?? "∅"}`;
}
