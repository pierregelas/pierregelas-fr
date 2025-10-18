// src/actions/importWordpress.ts
// Lecture CSV WordPress → mapping YAML maître → rendu Corps → création/MAJ de notes
// - Idempotence par post_id (findNoteByPostId)
// - maj_wp: false (infos depuis WP)
// - Ecrit le corps selon 'renderBodyFromMaster(master)' (Vignette / Vidéo / Notes)
// - Erreurs: loggées; en mode exécution (non dry-run), écriture d'une note dans NEW/ERRORS

import { readCsv } from "@core/csv";
import { mapWpRowToMaster } from "@core/mapping.wordpress";
import { emitYaml } from "@core/yamlMaster";
import { sanitizeForFilename, ensureUniquePath } from "@core/files";
import { findNoteByPostId } from "@core/upsert";
import { startRun, logLine, finishRun } from "@core/log";
import { renderBodyFromMaster } from "@core/bodyRenderer";
import type { ImportSummary, WpRow, MasterFields } from "@core/types";
import type { VaultIO } from "@core/upsert";

export interface ImportOptions {
  outDirAbs: string;
  dryRun?: boolean;
}

function toStr(v: unknown): string {
  return (v ?? "").toString().trim();
}

/** Construit le contenu d'une note à partir du master (YAML + body) */
function buildNoteContent(master: MasterFields): string {
  // Règle d'import : maj_wp = false (infos provenant de WP)
  (master as any).maj_wp = false;
  const yamlStr = emitYaml(master);
  const bodyStr = renderBodyFromMaster(master);
  return `${yamlStr}\n${bodyStr}`;
}

/** Écrit une note d'erreur dans NEW/ERRORS (si pas dry-run). */
async function writeErrorNote(
  opts: ImportOptions,
  io: VaultIO,
  row: Partial<WpRow>,
  message: string
): Promise<string> {
  const baseName = sanitizeForFilename(
	`ERROR_${toStr(row.wp_id) || "?"}_${toStr(row.wp_titre) || "sans-titre"}.md`
  );
  const outDir = `${opts.outDirAbs.replace(/[\/\\]+$/, "")}/ERRORS`;
  const dest = await ensureUniquePath(outDir, baseName);

  const yaml = [
	"---",
	"MAJ:",
	"maj_wp: false",
	"POST:",
	`post_titre_full: ${JSON.stringify(toStr(row.wp_titre) || "(inconnu)")}`,
	`post_id: ${JSON.stringify(toStr(row.wp_id) || "")}`,
	"WP:",
	`wp_error: ${JSON.stringify(message)}`,
	"---",
  ].join("\n");

  const body = `## Erreur d'import\n\n${message}`;
  await io.write(dest, `${yaml}\n${body}`);
  return dest;
}

/**
 * Importe un CSV WordPress (chemin absolu) et crée/MAJ des notes dans outDirAbs.
 * - dryRun: ne crée pas de fichiers, retourne uniquement le résumé/log.
 */
export async function importWordpressCsv(
  csvAbsPath: string,
  io: VaultIO,
  opts: ImportOptions
): Promise<ImportSummary> {
  const run = startRun({ kind: "import-wp", source: csvAbsPath });

  try {
	const rows: WpRow[] = await readCsv(csvAbsPath);
	const outDir = opts.outDirAbs.replace(/[\\/]+$/, "");

	for (let i = 0; i < rows.length; i++) {
	  const row = rows[i];
	  let status: "created" | "updated" | "error" = "created";
	  let path = "";

	  try {
		// 1) Mapping CSV -> master
		const master = mapWpRowToMaster(row);

		// 2) Déterminer le chemin cible (idempotence par post_id)
		const existing = await findNoteByPostId(io, toStr(row.wp_id));
		if (existing) {
		  status = "updated";
		  path = existing;
		} else {
		  const baseName = sanitizeForFilename(
			`${toStr((master as any).post_titre_full) || "sans-titre"}.md`
		  );
		  path = await ensureUniquePath(outDir, baseName);
		  status = "created";
		}

		// 3) Construire le contenu (YAML + Corps) et écrire si pas dry-run
		const fileContent = buildNoteContent(master as MasterFields);
		if (!opts.dryRun) {
		  await io.write(path, fileContent);
		}

		// 4) Log
		logLine(run, {
		  index: i,
		  status,
		  path,
		  post_id: toStr(row.wp_id),
		});
	  } catch (err: any) {
		status = "error";
		const msg = String(err?.message ?? err ?? "Erreur inconnue");
		if (!opts.dryRun) {
		  try {
			path = await writeErrorNote(opts, io, row, msg);
		  } catch {
			/* ignore nested error */
		  }
		}
		logLine(run, {
		  index: i,
		  status: "error",
		  message: msg,
		  path,
		  post_id: toStr(row?.wp_id),
		});
	  }
	}

	return finishRun(run);
  } catch (e: any) {
	// Erreur au niveau CSV (lecture/parsing)
	logLine(run, { index: -1, status: "error", message: String(e?.message ?? e) });
	return finishRun(run);
  }
}
