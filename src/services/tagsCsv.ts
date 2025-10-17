// src/services/tagsCsv.ts
// Lecture et parsing du CSV des tags (WP → Obsidian)

import type { Vault, TFile } from "obsidian";

/* ============================ Constantes ============================ */

export const TAGS_CSV_DIR = "wp_tags/wp_tags_csv";
export const TAGS_CSV_PATTERN = /^\d{4}-\d{2}-\d{2}_export_tags\.csv$/; // tri alpha = tri chrono
export const CSV_EXPECTED_HEADERS = [
  "wp_tags_id",
  "wp_tags_name",
  "wp_tags_slug",
  "wp_tags_count",
] as const;

/* ============================== Types =============================== */

export interface TagRow {
  id?: number;            // entier strict (absent si vide)
  name: string;           // trim()
  slug: string;           // trim().toLowerCase()
  count: number;          // entier >= 0
}

export interface ParsedCsv {
  headerValid: boolean;
  rows: TagRow[];
  errors: string[];       // anomalies rencontrées (non bloquantes)
}

/* ============================ Public API ============================ */

/** Retourne le dernier CSV (par tri alphanum sur le nom de fichier) ou null. */
export function findLatestCsv(vault: Vault): TFile | null {
  // Filtrer dans le dossier dédié
  const files = vault.getFiles().filter((f) => {
	if (!f.path.startsWith(TAGS_CSV_DIR + "/")) return false;
	if (!TAGS_CSV_PATTERN.test(f.name)) return false;
	return true;
  });

  if (files.length === 0) return null;
  // Tri lexicographique décroissant (AAAA-MM-JJ_export_tags.csv => ordre chrono)
  files.sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
  return files[0];
}

/** Lit et parse un fichier CSV donné. */
export async function readAndParseCsv(vault: Vault, file: TFile): Promise<ParsedCsv> {
  const raw = await vault.read(file);
  return parseTagsCsv(raw);
}

/** Parse + normalise le CSV brut (UTF-8/BOM/CRLF ok). */
export function parseTagsCsv(csvContent: string): ParsedCsv {
  const errors: string[] = [];
  const rows: TagRow[] = [];

  // Normalisation basique
  const text = (csvContent ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").filter((l) => l.length > 0);

  if (lines.length === 0) {
	return { headerValid: false, rows, errors: ["CSV vide"] };
  }

  // Lecture header (gérer BOM)
  const headerFields = splitCsvLine(stripBom(lines[0]));
  const headerValid =
	headerFields.length === CSV_EXPECTED_HEADERS.length &&
	headerFields.every((h, i) => h === CSV_EXPECTED_HEADERS[i]);

  if (!headerValid) {
	errors.push(
	  `En-têtes invalides. Attendu: ${CSV_EXPECTED_HEADERS.join(
		","
	  )} — Reçu: ${headerFields.join(",")}`
	);
  }

  // Lignes de données
  for (let i = 1; i < lines.length; i++) {
	const line = lines[i];
	if (!line.trim()) continue;

	const fields = splitCsvLine(line);
	if (fields.length !== CSV_EXPECTED_HEADERS.length) {
	  errors.push(`Ligne ${i + 1}: nombre de colonnes invalide (${fields.length})`);
	  continue;
	}

	const [idStr, nameRaw, slugRaw, countStr] = fields;

	const name = (nameRaw ?? "").trim();
	let slug = (slugRaw ?? "").trim().toLowerCase();

	// id: entier strict ou absent
	const id = toIntOrUndefined(idStr);
	// count: entier >= 0
	const countParsed = toIntOrUndefined(countStr);
	const count = typeof countParsed === "number" && countParsed >= 0 ? countParsed : 0;
	if (typeof countParsed !== "number" || countParsed < 0) {
	  errors.push(`Ligne ${i + 1}: 'wp_tags_count' invalide → ${countStr}`);
	}

	// Slug validation (pas d'espaces, caractères simples a-z0-9-)
	if (/\s/.test(slug)) {
	  errors.push(`Ligne ${i + 1}: 'wp_tags_slug' contient des espaces → "${slugRaw}"`);
	  slug = slug.replace(/\s+/g, "-"); // normalisation douce
	}
	if (!/^[a-z0-9-]+$/.test(slug) && slug.length > 0) {
	  errors.push(`Ligne ${i + 1}: 'wp_tags_slug' contient des caractères non conformes → "${slugRaw}"`);
	  // on conserve la valeur normalisée en minuscules malgré tout
	}

	rows.push({
	  id,
	  name,
	  slug,
	  count,
	});
  }

  return { headerValid, rows, errors };
}

/* ============================ Helpers CSV =========================== */

/** Découpe une ligne CSV en champs, avec support des guillemets et des virgules. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
	const ch = line[i];

	if (inQuotes) {
	  if (ch === '"') {
		const next = line[i + 1];
		if (next === '"') {
		  cur += '"'; // échappement "" → "
		  i++;
		} else {
		  inQuotes = false;
		}
	  } else {
		cur += ch;
	  }
	  continue;
	}

	if (ch === '"') {
	  inQuotes = true;
	  continue;
	}
	if (ch === ",") {
	  out.push(cur);
	  cur = "";
	  continue;
	}
	cur += ch;
  }
  out.push(cur);
  return out;
}

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, "");
}

function toIntOrUndefined(s: string | undefined): number | undefined {
  if (s == null) return undefined;
  const t = String(s).trim();
  if (t === "" || t.toLowerCase() === "null") return undefined;
  if (!/^-?\d+$/.test(t)) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}
