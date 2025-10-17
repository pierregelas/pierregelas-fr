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
  outDirAbs: string;
  dryRun?: boolean;
}

/** Utilitaire: écrit une "note d'erreur" dans NEW/ERRORS avec YAML (autant que possible) + message. */
async function writeErrorNote(
  rowIndex: number,
  row: WpRow,
  outDirAbs: string,
  io: VaultIO,
  dryRun: boolean,
  errorMessage: string
): Promise<string | undefined> {
  try {
	const errorsDirAbs = outDirAbs.replace(/[\/\\]+$/,"") + "/ERRORS";
	const baseTitle = (row?.wp_titre?.trim?.() || `Ligne ${rowIndex + 1}`);
	const filename = sanitizeForFilename(`[ERROR] ${baseTitle} [${row?.wp_id ?? "no-id"}].md`);
	const targetAbsPath = await ensureUniquePath(errorsDirAbs, filename, io.exists.bind(io));

	// Tente de produire le YAML maître (même si des champs requis manquent)
	let yaml = "";
	try {
	  const master = mapWpRowToMaster(row);
	  // Sécurité: s'assurer que maj_wp est false quoi qu'il arrive
	  (master as any).maj_wp = false;
	  yaml = emitYaml(master, { quoteNumericIdsInImages: true });
	} catch {
	  // Fallback très simple si mapping échoue (rare)
	  const safeTitle = baseTitle.replace(/"/g, '\\"');
	  yaml = `---\npost_titre_full: "${safeTitle}"\nmaj_wp: false\n---`;
	}

	const body =
	  `# Import WP — ERREUR\n\n` +
	  `- Ligne: ${rowIndex + 1}\n` +
	  `- Raison: ${errorMessage}\n\n` +
	  `\`\`\`json\n${JSON.stringify(row, null, 2)}\n\`\`\`\n`;

	if (!dryRun) {
	  await io.write(targetAbsPath, `${yaml}\n${body}`);
	}
	return targetAbsPath;
  } catch {
	return undefined;
  }
}

/** Exécute l'import WordPress CSV → notes YAML maître (maj_wp=false, écrasement total). */
export async function importWordpressCsv(
  absCsvPath: string,
  io: VaultIO,
  opts: ImportOptions
): Promise<ImportSummary> {
  const { outDirAbs, dryRun = false } = opts;
  const run = startRun();

  const rows = (await readCsv(absCsvPath, io.read.bind(io))) as unknown as WpRow[];
  if (!Array.isArray(rows) || rows.length === 0) {
	return finishRun(run);
  }

  for (let i = 0; i < rows.length; i++) {
	const row = rows[i];
	try {
	  // Validations minimales (si manquants => ERREUR + note dans NEW/ERRORS/)
	  const missing: string[] = [];
	  if (!row.wp_id) missing.push("wp_id");
	  if (!row.wp_titre) missing.push("wp_titre");
	  if (!row.wp_date) missing.push("wp_date");

	  if (missing.length) {
		const path = await writeErrorNote(
		  i, row, outDirAbs, io, dryRun,
		  `Champs requis manquants: ${missing.join(", ")}`
		);
		logLine(run, {
		  index: i,
		  status: "error",
		  message: `Champs requis manquants: ${missing.join(", ")}`,
		  path,
		  post_id: row.wp_id,
		});
		continue;
	  }

	  // Mapping → MasterFields
	  const master = mapWpRowToMaster(row);
	  // ✅ maj_wp doit être false
	  (master as any).maj_wp = false;

	  // Détermination chemin cible via idempotence (post_id)
	  const found = await findNoteByPostId(master.post_id, io);
	  let targetAbsPath: string;
	  let status: "created" | "updated";

	  if (found?.path) {
		targetAbsPath = found.path;
		status = "updated";
	  } else {
		const filename = sanitizeForFilename(master.post_titre_full);
		targetAbsPath = await ensureUniquePath(outDirAbs, filename, io.exists.bind(io));
		status = "created";
	  }

	  // Émission YAML maître
	  const yaml = emitYaml(master, { quoteNumericIdsInImages: true });
	  const content = `${yaml}\n`; // corps vide (court terme)

	  // Écriture (ou dry-run)
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
	  // Toute autre erreur ⇒ note d'erreur dans NEW/ERRORS/
	  const path = await writeErrorNote(
		i, row, outDirAbs, io, dryRun,
		String(err?.message ?? err ?? "Erreur inconnue")
	  );
	  logLine(run, {
		index: i,
		status: "error",
		message: String(err?.message ?? err ?? "Erreur inconnue"),
		path,
		post_id: row?.wp_id,
	  });
	}
  }

  return finishRun(run);
}
