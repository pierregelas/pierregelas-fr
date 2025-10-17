// src/services/tagsTable.ts (v2)
// Lecture/écriture de la table des tags (ob_tags_table.md) — 5 colonnes : id | name | slug | count | notes

import type { Vault, TAbstractFile, TFile } from "obsidian";
import { normalizePath } from "obsidian";

/* ============================ Constantes ============================ */

export const TAGS_TABLE_PATH = "wp_tags/ob_tags_table.md";

/** Entêtes attendues dans la table Markdown (ordre fixe, v2). */
export const TABLE_HEADERS = [
  "ob_tags_id",
  "ob_tags_name",
  "ob_tags_slug",
  "ob_tags_count",
  "ob_tags_notes",
] as const;

/* ============================== Types =============================== */

export interface LocalTagRow {
  id?: number;        // entier strict (absent si vide)
  name: string;       // trim()
  slug: string;       // trim().toLowerCase()
  count: number;      // entier >= 0
  notes?: string;     // "", "obc", "obm"
}

export interface TagsTableParse {
  /** Index (ligne) de l’entête '| ob_tags_id | ...' dans le fichier. */
  headerLine: number;
  /** Index (ligne) de début du bloc table (entête). */
  startLine: number;
  /** Index (ligne) de fin du bloc table (dernière ligne de données incluse). */
  endLine: number;
  /** Lignes parsées → LocalTagRow[] (normalisées). */
  rows: LocalTagRow[];
}

export interface TagsDoc {
  file: TFile;
  raw: string;                // contenu brut du fichier
  yamlRaw: string | null;     // frontmatter YAML brut (ou null si absent)
  table: TagsTableParse | null;
}

/* ============================ Public API ============================ */

/** Retourne le fichier `ob_tags_table.md` s'il existe, sinon null. */
export function findTagsTableFile(vault: Vault): TFile | null {
  const path = normalizePath(TAGS_TABLE_PATH);
  const af = vault.getAbstractFileByPath(path);
  return af instanceof (Object.getPrototypeOf(vault.getFiles()[0] || {})?.constructor ?? Object) && (af as any).extension === "md"
	? (af as TFile)
	: (af instanceof (TFile as any) ? (af as TFile) : (af as TFile | null));
}

/** Lit le fichier et renvoie contenu brut + frontmatter brut + table parsée. */
export async function readTagsTable(vault: Vault): Promise<TagsDoc | null> {
  const file = findTagsTableFile(vault);
  if (!file) return null;

  const raw = await vault.read(file);
  const { yamlRaw, body } = splitYaml(raw);
  const table = parseFirstTagsTable(body);

  return { file, raw, yamlRaw, table };
}

/**
 * Construit la table Markdown à partir d'un tableau de LocalTagRow.
 * - Ordre trié par `slug` ascendant (stabilité visuelle).
 * - Format stable (pas d'espaces superflus).
 */
export function renderTagsTable(rowsIn: LocalTagRow[]): string {
  const rows = [...(rowsIn || [])].sort((a, b) => {
	const as = (a.slug || "").toString();
	const bs = (b.slug || "").toString();
	return as < bs ? -1 : as > bs ? 1 : 0;
  });

  const hdr = `| ${TABLE_HEADERS.join(" | ")} |`;
  const sep = `| --- | --- | --- | --- | --- |`;

  const lines: string[] = [hdr, sep];
  for (const r of rows) {
	const idStr = typeof r.id === "number" && Number.isFinite(r.id) ? String(r.id) : "";
	const name = (r.name ?? "").trim();
	const slug = (r.slug ?? "").trim().toLowerCase();
	const countStr =
	  typeof r.count === "number" && Number.isFinite(r.count) && r.count >= 0
		? String(Math.trunc(r.count))
		: "0";
	const notes = (r.notes ?? "").trim();

	lines.push(`| ${idStr} | ${name} | ${slug} | ${countStr} | ${notes} |`);
  }
  return lines.join("\n") + "\n";
}

/**
 * Remplace le bloc table (si trouvé) dans le contenu brut par `newTableMd`.
 * Retourne le nouveau contenu.
 * - Ne touche pas au YAML (utiliser applyYamlPatch ailleurs).
 */
export function replaceTableInContent(
  raw: string,
  table: TagsTableParse | null,
  newTableMd: string
): string {
  const { yamlRaw, body, yamlWithDelimiters } = splitYaml(raw);
  if (!table) {
	// Pas de table → on insère la table à la fin du corps, précédée d'une ligne vide si utile.
	const sep = body.endsWith("\n") ? "" : "\n";
	const newBody = body + sep + newTableMd;
	return yamlWithDelimiters ? yamlWithDelimiters + "\n" + newBody : newBody;
  }

  const bodyLines = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const before = bodyLines.slice(0, table.startLine).join("\n");
  const after = bodyLines.slice(table.endLine + 1).join("\n");
  const joinBefore = before.length > 0 && !before.endsWith("\n") ? before + "\n" : before;
  const joinAfter = after.length > 0 && !after.startsWith("\n") ? "\n" + after : after;

  const newBody = joinBefore + newTableMd + joinAfter;
  return yamlWithDelimiters ? yamlWithDelimiters + "\n" + newBody : newBody;
}

/** Sauvegarde le fichier courant dans `wp_tags/backup/ob_tags_table_YYYYMMDD-HHmm.md`. */
export async function backupTagsTable(vault: Vault, file: TFile): Promise<TFile> {
  const now = toLocalTimestamp();
  const folderPath = normalizePath("wp_tags/backup");
  const backupName = `ob_tags_table_${now}.md`;
  const backupPath = normalizePath(`${folderPath}/${backupName}`);

  // Assurer le dossier
  const folderAf: TAbstractFile | null = vault.getAbstractFileByPath(folderPath);
  if (!folderAf) {
	await vault.createFolder(folderPath);
  }

  const content = await vault.read(file);
  const existed = vault.getAbstractFileByPath(backupPath);
  if (existed) {
	// évite l’écrasement improbable
	return existed as TFile;
	}
  return await vault.create(backupPath, content);
}

/* ============================ Helpers ============================ */

/** Découpe en {yamlRaw, body, yamlWithDelimiters}. Supporte fichiers sans YAML. */
function splitYaml(raw: string): {
  yamlRaw: string | null;
  body: string;
  yamlWithDelimiters: string | null;
} {
  const text = (raw ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.startsWith("---\n")) {
	return { yamlRaw: null, body: text, yamlWithDelimiters: null };
  }
  const idx = text.indexOf("\n---", 4);
  if (idx < 0) {
	// Frontmatter non terminé → considérer tout comme body
	return { yamlRaw: null, body: text, yamlWithDelimiters: null };
  }
  const yaml = text.slice(4, idx).trimEnd();
  const rest = text.slice(idx + 4);
  const yamlWith = `---\n${yaml}\n---`;
  const body = rest.startsWith("\n") ? rest.slice(1) : rest;
  return { yamlRaw: yaml, body, yamlWithDelimiters: yamlWith };
}

/** Parse la première table ayant exactement les entêtes attendues (v2). */
function parseFirstTagsTable(body: string): TagsTableParse | null {
  const lines = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // Cherche une ligne d'entête qui matche précisément nos headers (espaces tolérés)
  const headerRegex = new RegExp(
	"^\\|\\s*" +
	  TABLE_HEADERS.map((h) => escapeRegex(h)).join("\\s*\\|\\s*") +
	  "\\s*\\|\\s*$",
	"i"
  );

  let headerLine = -1;
  for (let i = 0; i < lines.length; i++) {
	const L = lines[i].trim();
	if (headerRegex.test(L)) {
	  headerLine = i;
	  break;
	}
  }
  if (headerLine < 0) return null;

  // La ligne suivante doit être le séparateur | --- | --- | ...
  const sepLine = lines[headerLine + 1]?.trim() ?? "";
  const sepOk = /^\|\s*-+\s*\|\s*-+\s*\|\s*-+\s*\|\s*-+\s*\|\s*-+\s*\|$/.test(sepLine);
  if (!sepOk) return null;

  const startLine = headerLine; // début au header
  let endLine = headerLine + 1; // au moins la ligne séparateur

  const outRows: LocalTagRow[] = [];
  for (let i = headerLine + 2; i < lines.length; i++) {
	const raw = lines[i];
	// Fin de table si ligne vide ou si la ligne ne contient pas de '|'
	if (!raw || raw.trim() === "" || raw.indexOf("|") < 0) {
	  endLine = i - 1;
	  break;
	}
	const cells = splitTableRow(raw);
	if (cells.length < TABLE_HEADERS.length) {
	  endLine = i - 1;
	  break;
	}
	const [idStr, nameRaw, slugRaw, countStr, notesRaw] = cells;

	const id = toIntOrUndefined(idStr);
	const name = (nameRaw ?? "").trim();
	const slug = (slugRaw ?? "").trim().toLowerCase();
	const countParsed = toIntOrUndefined(countStr);
	const count = typeof countParsed === "number" && countParsed >= 0 ? countParsed : 0;
	const notes = (notesRaw ?? "").trim();

	outRows.push({ id, name, slug, count, notes });
	endLine = i; // dernière ligne valide atteinte
  }

  return { headerLine, startLine, endLine, rows: outRows };
}

function splitTableRow(row: string): string[] {
  // Découpe simple entre | ... | ... | ... | (ignore le 1er et dernier pipe)
  const trimmed = row.trim();
  if (!trimmed.startsWith("|")) return [];
  const inner = trimmed.replace(/^\|\s*/, "").replace(/\s*\|$/, "");
  return inner.split("|").map((s) => s.trim());
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Timestamp local YYYYMMDD-HHmm (naïf) */
function toLocalTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}${MM}${DD}-${hh}${mm}`;
}
