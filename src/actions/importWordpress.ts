// src/actions/importWordpress.ts
// Import CSV WordPress → mapping YAML maître → rendu Corps → création/MAJ
// - Idempotence par post_id (findNoteByPostId)
// - maj_wp: false (infos depuis WP)
// - Corps via renderBodyFromMaster(master): Vignette / Vidéo / Notes
// - ensureUniquePath(..., io.exists) pour éviter les collisions
// - Erreurs enrichies: wp_row_index, wp_titre_raw, wp_id_raw, wp_headers_debug
// - Lignes vides: comptées comme erreurs
// - NEW: MAJ identiques vs modifiées + détail des champs modifiés
// - NEW 2025-10-19: écrit WP-IMPORT (wp_import_dataset_key / wp_import_dataset_id) dans la note

import { readCsv } from "@core/csv";
import { mapWpRowToMaster } from "@core/mapping.wordpress";
import { emitYaml } from "@core/yamlMaster";
import { sanitizeForFilename, ensureUniquePath } from "@core/files";
import { findNoteByPostId } from "@core/upsert";
import { startRun, logLine, finishRun } from "@core/log";
import { renderBodyFromMaster } from "@core/bodyRenderer";
import { parseCsvNameV2 } from "@core/csvMeta";
import type { ImportSummary, WpRow, MasterFields, ImportErrorRecord } from "@core/types";
import type { VaultIO } from "@core/upsert";
import { setWpImportBlock } from "../services/yamlPatch"; // chemin relatif → src/services/yamlPatch.ts

export interface ImportOptions {
  outDirAbs: string;
  dryRun?: boolean;
}

function toStr(v: unknown): string {
  return (v ?? "").toString().trim();
}

function basename(p: string): string {
  // Récupère le dernier segment d'un chemin (support / et \)
  return (p ?? "").replace(/^[\s\S]*[\/\\]/, "");
}

/** Construit le contenu d'une note à partir du master (YAML + body) */
function buildNoteContent(master: MasterFields): string {
  const yamlStr = emitYaml(master);
  const bodyStr = renderBodyFromMaster(master);
  return `${yamlStr}\n${bodyStr}`;
}

/** Écrit une note d'erreur dans NEW/ERRORS (si pas dry-run). */
async function writeErrorNote(
  opts: ImportOptions,
  io: VaultIO,
  row: Partial<WpRow>,
  message: string,
  rowIndex?: number
): Promise<string> {
  const baseName = sanitizeForFilename(
	`ERROR_${toStr(row.wp_id) || "?"}_${toStr(row.wp_titre) || "sans-titre"}.md`
  );
  const outDir = `${opts.outDirAbs.replace(/[\/\\]+$/, "")}/ERRORS`;
  const dest = await ensureUniquePath(outDir, baseName, io.exists);

  const headers = Object.keys(row ?? {}).sort();
  const yaml = [
	"---",
	"MAJ:",
	"maj_wp: false",
	"POST:",
	`post_titre_full: ${JSON.stringify(toStr(row.wp_titre) || "(inconnu)")}`,
	`post_id: ${JSON.stringify(toStr(row.wp_id) || "")}`,
	"WP:",
	`wp_error: ${JSON.stringify(message)}`,
	"WP_DEBUG:",
	`wp_row_index: ${rowIndex ?? -1}`,
	`wp_titre_raw: ${JSON.stringify((row as any)?.wp_titre ?? "")}`,
	`wp_id_raw: ${JSON.stringify((row as any)?.wp_id ?? "")}`,
	"wp_headers_debug:",
	...headers.map(h => `  - ${JSON.stringify(h)}`),
	"---",
  ].join("\n");

  const body = `## Erreur d'import\n\n${message}`;
  if (!opts.dryRun) {
	await io.write(dest, `${yaml}\n${body}`);
  }
  return dest;
}

function inferErrorType(message: string): string {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("ligne csv vide")) return "LIGNE_VIDE";
  if (normalized.includes("post_titre_full manquant")) return "TITRE_MANQUANT";
  if (normalized.includes("post_id invalide")) return "ID_INVALIDE";
  if (normalized.includes("post_id manquant")) return "ID_INVALIDE";
  return "";
}

function rawString(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/** Validation stricte (spécifique Import CSV): wp_titre → post_titre_full, wp_id → post_id, obligatoires. */
function enforceTitleAndIdForImport(master: any, row: any): void {
  master.post_titre_full = toStr(row.wp_titre);
  master.post_id = toStr(row.wp_id);
  if (!toStr(master.post_titre_1)) master.post_titre_1 = master.post_titre_full;

  if (!toStr(master.post_titre_full)) {
	throw new Error("post_titre_full manquant (wp_titre vide)");
  }
  if (!toStr(master.post_id)) {
	throw new Error("post_id manquant (wp_id vide)");
  }
}

/* ───────────────────────── Diff existant vs nouveau (champs modifiés) ───────────────────────── */

function splitFrontmatter(text: string): { yfm: string; body: string } {
  // Extrait le frontmatter YAML si présent (--- ... --- au tout début)
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { yfm: "", body: text ?? "" };
  const yfm = m[1] ?? "";
  const rest = text.slice(m[0].length);
  return { yfm, body: rest ?? "" };
}

function normalizeEOL(s: string): string {
  return (s ?? "").replace(/\r\n?/g, "\n");
}

function extractYamlKV(yfm: string): Record<string, string> {
  // Parse minimaliste des lignes 'clé: valeur' en haut niveau (ignore sections type 'POST:' sans valeur)
  const map: Record<string, string> = {};
  const lines = normalizeEOL(yfm).split("\n");
  for (const line of lines) {
	// ignore listes et lignes vides
	if (!line || /^\s*-/.test(line)) continue;
	const m = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/);
	if (!m) continue;
	const key = m[1].trim();
	const val = m[2].trim();
	if (key && val !== undefined && val !== "") {
	  map[key] = val;
	}
  }
  return map;
}

async function diffChangedFields(io: VaultIO, absPath: string, nextContent: string): Promise<string[]> {
  // Lit le contenu courant, compare YAML clé/val + corps
  let current = "";
  try {
	current = await io.read(absPath);
  } catch {
	return ["<inexistant>"]; // ne devrait pas arriver côté "updated", mais safety
  }
  const cur = splitFrontmatter(current);
  const nxt = splitFrontmatter(nextContent);

  const curMap = extractYamlKV(cur.yfm);
  const nxtMap = extractYamlKV(nxt.yfm);

  const keys = new Set([...Object.keys(curMap), ...Object.keys(nxtMap)]);
  const changed: string[] = [];
  for (const k of keys) {
	const a = curMap[k] ?? "";
	const b = nxtMap[k] ?? "";
	if (a !== b) changed.push(k);
  }

  if (normalizeEOL(cur.body) !== normalizeEOL(nxt.body)) {
	changed.push("corps");
  }
  return changed;
}

/**
 * Importe un CSV WordPress et renvoie un ImportSummary enrichi avec les listes:
 * - created_paths[]
 * - updated_identical_paths[], updated_modified_paths[]
 * - updated_modified_details[]: { path, fields: string[] }
 * - error_paths[]
 * ainsi que les compteurs updated_identical / updated_modified.
 *
 * NEW 2025-10-19:
 * - Parse du nom CSV v2 "<dataset_key>_<YYYYMMDD>_PG.csv"
 * - Écriture WP-IMPORT dans chaque note (wp_import_dataset_key / wp_import_dataset_id)
 */
export async function importWordpressCsv(
  csvAbsPath: string,
  io: VaultIO,
  opts: ImportOptions
): Promise<ImportSummary & {
  created_paths: string[];
  updated_identical_paths: string[];
  updated_modified_paths: string[];
  updated_modified_details: { path: string; fields: string[] }[];
  error_paths: string[];
  updated_identical: number;
  updated_modified: number;
  error_records: ImportErrorRecord[];
}> {
  const run = startRun();
  const errorRecords: ImportErrorRecord[] = [];

  // Parse strict du nom CSV v2 (ex.: "minutes-articles_20251018_PG.csv")
  const csvName = basename(csvAbsPath);
  let datasetKey: string | undefined;
  let datasetId: number | undefined;
  try {
	const parsed = parseCsvNameV2(csvName);
	datasetKey = parsed.datasetKey;
	datasetId = parsed.datasetId;
  } catch (e: any) {
	// Par sécurité, si on arrive ici, on considère que la modale aurait dû bloquer.
	// On remonte une erreur claire pour éviter un import incohérent.
	logLine(run, { index: -1, status: "error", message: `Nom CSV invalide: ${String(e?.message ?? e)}` });
	const base = finishRun(run) as any;
	  return {
		 ...base,
		 created: 0,
		 updated: 0,
		 errors: 1,
		 updated_identical: 0,
		 updated_modified: 0,
		 created_paths: [],
		 updated_identical_paths: [],
		 updated_modified_paths: [],
		 updated_modified_details: [],
		 error_paths: [],
		 error_records: errorRecords,
	   };
  }

  const acc = {
	created: 0,
	updated: 0,
	errors: 0,
	updated_identical: 0,
	updated_modified: 0,
	created_paths: [] as string[],
	updated_identical_paths: [] as string[],
	updated_modified_paths: [] as string[],
	updated_modified_details: [] as { path: string; fields: string[] }[],
	error_paths: [] as string[],
  };

  try {
	  // Lecture CSV (injection du reader Vault)
	  // Force explicit separateur ";" (ajoute/remplace directive `sep=;`) pour éviter les champs vides causés
	  // par une détection erronée en ",".
		const rows: WpRow[] = await readCsv(csvAbsPath, async (abs) => {
			  const raw = await io.read(abs);
			  const hasBom = raw.charCodeAt(0) === 0xfeff;
			  const withoutBom = hasBom ? raw.slice(1) : raw;
			  if (/^\s*sep=;/i.test(withoutBom)) {
				return hasBom ? `\uFEFF${withoutBom}` : withoutBom;
			  }
			  const normalized = withoutBom.replace(/^\s*sep=,/i, "sep=;");
			  if (/^\s*sep=;/i.test(normalized)) {
				return hasBom ? `\uFEFF${normalized}` : normalized;
			  }
			  const updated = `sep=;\n${normalized}`;
			  return hasBom ? `\uFEFF${updated}` : updated;
		});
	  const outDir = opts.outDirAbs.replace(/[\\/]+$/, "");

	  for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		let path = "";

		try {
			  // 0) Lignes vides explicites
			  const idRawOriginal = rawString((row as any)?.wp_id);
			  const titreRawOriginal = rawString((row as any)?.wp_titre);
			  const idRaw = toStr(idRawOriginal);
			  const titreRaw = toStr(titreRawOriginal);
			  if (!idRaw && !titreRaw) {
				throw new Error("ligne CSV vide (wp_id et wp_titre vides)");
			  }

			  const idForValidation = idRawOriginal.trim();
			  if (idForValidation && !/^\d+$/.test(idForValidation)) {
				throw new Error("post_id invalide (wp_id non numérique)");
			  }
		// 1) Mapping CSV -> master
		const master = mapWpRowToMaster(row) as any;

		// 2) Règle stricte Import CSV: titre/id obligatoires
		enforceTitleAndIdForImport(master, row);

		// 3) Marquer la source (maj_wp côté import WP = false)
		(master as any).maj_wp = false;

		// 4) Écrire WP-IMPORT (famille/ID) dans le master **avant** sérialisation
		if (datasetKey && typeof datasetId === "number") {
		  setWpImportBlock(master as any, { datasetKey, datasetId });
		}

		// 5) Déterminer le chemin cible (idempotence par post_id)
		const existing = await findNoteByPostId(toStr(master.post_id), io);
		const nextContent = buildNoteContent(master as MasterFields);

		if (existing && existing.path) {
		  path = existing.path;

		  // Diff contenu (identique vs modifié) + champs modifiés
		  const changedFields = await diffChangedFields(io, path, nextContent);
		  const identical = changedFields.length === 0;

		  acc.updated += 1;
		  if (identical) {
			acc.updated_identical += 1;
			acc.updated_identical_paths.push(path);
		  } else {
			acc.updated_modified += 1;
			acc.updated_modified_paths.push(path);
			acc.updated_modified_details.push({ path, fields: changedFields });

			if (!opts.dryRun) await io.write(path, nextContent);
		  }

		  logLine(run, {
			index: i,
			status: "updated",
			path,
			post_id: toStr(master.post_id),
			identical
		  });
		} else {
		  const baseName = sanitizeForFilename(`${toStr(master.post_titre_full) || "sans-titre"}.md`);
		  path = await ensureUniquePath(outDir, baseName, io.exists);

		  if (!opts.dryRun) await io.write(path, nextContent);

		  acc.created += 1;
		  acc.created_paths.push(path);

		  logLine(run, { index: i, status: "created", path, post_id: toStr(master.post_id) });
		}
	  } catch (err: any) {
			const msg = String(err?.message ?? err ?? "Erreur inconnue");
			let errPath = "";
			if (!opts.dryRun) {
			  try { errPath = await writeErrorNote(opts, io, row, msg, i); } catch { /* noop */ }
			}
			const errorFileName = errPath ? basename(errPath) : "";
			const errorWiki = errorFileName ? `[[${errorFileName.replace(/\.md$/i, "")}]]` : "";
			errorRecords.push({
			  wp_error: msg,
			  post_id: toStr((row as any)?.wp_id),
			  wp_row_index: i,
			  wp_id_raw: rawString((row as any)?.wp_id),
			  wp_titre_raw: rawString((row as any)?.wp_titre),
			  error_type: inferErrorType(msg),
			  errorFileWikilink: errorWiki,
			});
			acc.errors += 1;
			if (errPath) acc.error_paths.push(errPath);

			logLine(run, {
			  index: i,
	  status: "error",
	  message: msg,
	  path: errPath,
	  post_id: toStr((row as any)?.wp_id),
	});
  }
}

const base = finishRun(run) as any;
	return {
	  ...base,
	  created: acc.created,
	  updated: acc.updated,
	  errors: acc.errors,
	  updated_identical: acc.updated_identical,
	  updated_modified: acc.updated_modified,
	  created_paths: acc.created_paths,
	  updated_identical_paths: acc.updated_identical_paths,
	  updated_modified_paths: acc.updated_modified_paths,
	  updated_modified_details: acc.updated_modified_details,
	  error_paths: acc.error_paths,
	  error_records: errorRecords,
	};
} catch (e: any) {
	logLine(run, { index: -1, status: "error", message: String(e?.message ?? e) });
	const base = finishRun(run) as any;
	return {
	  ...base,
	  created: 0,
	  updated: 0,
	  errors: 1,
	  updated_identical: 0,
	  updated_modified: 0,
	  created_paths: [],
	  updated_identical_paths: [],
	  updated_modified_paths: [],
	  updated_modified_details: [],
	  error_paths: [],
	  error_records: errorRecords,
	};
}
}
