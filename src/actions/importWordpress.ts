// src/actions/importWordpress.ts
import { readCsv } from "@core/csv";
import { mapWpRowToMaster } from "@core/mapping.wordpress";
import { emitYaml } from "@core/yamlMaster";
import { sanitizeForFilename, ensureUniquePath } from "@core/files";
import { findNoteByPostId } from "@core/upsert";
import { startRun, logLine, finishRun } from "@core/log";
import type { ImportSummary, WpRow } from "@core/types";
import type { VaultIO } from "@core/upsert";

export interface ImportOptions {
  /** Dossier de sortie absolu (court terme: "/NEW"). */
  outDirAbs: string;
  /** Mode aperçu (ne rien écrire). Par défaut: false. */
  dryRun?: boolean;
}

/** Exécute l'import WordPress CSV → notes YAML maître (maj_wp=true, écrasement total). */
export async function importWordpressCsv(
  absCsvPath: string,
  io: VaultIO,
  opts: ImportOptions
): Promise<ImportSummary> {
  const { outDirAbs, dryRun = false } = opts;
  const run = startRun();

  // 1) Lire CSV (séparateur `;`) via io.read
  const rows = (await readCsv(absCsvPath, io.read.bind(io))) as unknown as WpRow[];
  if (!Array.isArray(rows) || rows.length === 0) {
	return finishRun(run);
  }

  // 2) Traiter ligne par ligne
  for (let i = 0; i < rows.length; i++) {
	const row = rows[i];
	try {
	  // Validations minimales
	  if (!row.wp_id || !row.wp_titre || !row.wp_date) {
		logLine(run, {
		  index: i,
		  status: "error",
		  message: "Champs requis manquants (wp_id/wp_titre/wp_date).",
		});
		continue;
	  }

	  // 3) Mapping → MasterFields (conforme Tableau 1)
	  const master = mapWpRowToMaster(row);
	  // (court terme) maj_wp est forcé à true par les règles, ce qui correspond à l’écrasement total.

	  // 4) Déterminer le chemin cible (idempotence par post_id)
	  const found = await findNoteByPostId(master.post_id, io);
	  let targetAbsPath: string;
	  let status: "created" | "updated";

	  if (found?.path) {
		targetAbsPath = found.path;
		status = "updated";
	  } else {
		// Nouveau fichier → /NEW/{{wp_titre}}.md (sanitization : garde ? et !)
		const filename = sanitizeForFilename(master.post_titre_full);
		targetAbsPath = await ensureUniquePath(outDirAbs, filename, io.exists.bind(io));
		status = "created";
	  }

	  // 5) Émettre le YAML maître
	  const yaml = emitYaml(master, { quoteNumericIdsInImages: true });
	  const content = `${yaml}\n`; // corps vide (court terme)

	  // 6) Écrire (ou dry-run)
	  if (!dryRun) {
		await io.write(targetAbsPath, content);
	  }

	  logLine(run, {
		index: i,
		status,
		message: dryRun ? "(dry-run) aucun fichier écrit" : `OK: ${status}`,
		path: targetAbsPath,
		post_id: master.post_id,
	  });
	} catch (err: any) {
	  logLine(run, {
		index: i,
		status: "error",
		message: String(err?.message ?? err ?? "Erreur inconnue"),
	  });
	}
  }

  // 7) Récap
  return finishRun(run);
}
