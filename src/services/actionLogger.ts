// src/services/actionLogger.ts
// Logger Markdown ultra-léger, mutualisable pour toutes les actions.
// Écrit un fichier par exécution dans: wp_tags/logs_tests/YYYYMMDD-HHmm_action-id.md

import type { Vault, TAbstractFile, TFile } from "obsidian";
import { normalizePath } from "obsidian";
import { applyYamlPatch } from "./yamlPatch";

/* ============================ Constantes ============================ */

export const LOGS_DIR = "wp_tags/logs_tests";

/* ============================== Types =============================== */

export type ActionStatus = "success" | "cancel" | "error";

export interface BeginLogOptions {
  actionVersion?: string;
  csvFileName?: string;      // ex: "2025-10-17_export_tags.csv" (pour tags)
  csvRows?: number;          // compteur d'entrées CSV
  tableRowsBefore?: number;  // compteur lignes avant (si pertinent)
}

export interface FinalizeLogOptions {
  status: ActionStatus;
  errorMessage?: string;
  appliedCounts?: Partial<Record<
	"nouveaux_tags" | "id_update" | "name_update" | "count_update",
	number
  >>;
  diffCounts?: Partial<Record<
	"nouveaux_tags" | "id_update" | "name_update" | "count_update" | "tags_a_creer" | "tags_a_modifier" | "problemes",
	number
  >>;
  backupPath?: string;       // ex: "wp_tags/backup/ob_tags_table_YYYYMMDD-HHmm.md"
  wpUpdateAfter?: boolean;   // booléen natif
  tableRowsAfter?: number;   // compteur final (si pertinent)
  finalTableMd?: string;     // pour appendre la table finale en bloc ```md
  yamlSummary?: Record<string, string | number | boolean | null>; // ex: { tags_last_udpdate, tags_last_csv, wp_update }
}

/* ============================ Helpers internes ============================ */

/** Récupère le TFile de log de manière robuste selon la version d’Obsidian. */
function getLogFile(vault: Vault, path: string): TFile | null {
  const norm = normalizePath(path);
  const vAny = vault as any;
  if (typeof vAny.getFileByPath === "function") {
	const tf = vAny.getFileByPath(norm);
	if (tf) return tf as TFile;
  }
  const af = vault.getAbstractFileByPath(norm);
  if (!af) return null;
  if ((af as any).children) return null; // dossier
  return af as TFile;
}

async function ensureFolder(vault: Vault, folderPath: string): Promise<void> {
  const path = normalizePath(folderPath);
  const af: TAbstractFile | null = vault.getAbstractFileByPath(path);
  if (!af) await vault.createFolder(path);
}

async function uniquePath(vault: Vault, desiredPath: string): Promise<string> {
  let p = normalizePath(desiredPath);
  const extIdx = p.lastIndexOf(".");
  const base = extIdx >= 0 ? p.slice(0, extIdx) : p;
  const ext = extIdx >= 0 ? p.slice(extIdx) : "";
  let i = 1;
  while (vault.getAbstractFileByPath(p)) {
	p = `${base}-${i++}${ext}`;
  }
  return p;
}

function toCompactStamp(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}${MM}${DD}-${hh}${mm}`;
}

function toLocalIsoMinute(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}-${MM}-${DD} ${hh}:${mm}`;
}

function safeDurationMs(startedAt: string, finishedAt: string): number {
  const p = (s: string) => {
	const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
	if (!m) return NaN;
	const [_, Y, M, D, h, min] = m;
	return new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(min), 0, 0).getTime();
  };
  const a = p(startedAt);
  const b = p(finishedAt);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, b - a);
}

/* ============================ Public API ============================ */

/**
 * Crée le fichier de log avec YAML minimal + en-têtes de sections.
 * Retourne le path du log et des métadonnées utiles.
 */
export async function beginActionLog(
  vault: Vault,
  actionId: string,
  opts: BeginLogOptions = {}
): Promise<{ logPath: string; logId: string; startedAt: string }> {
  await ensureFolder(vault, LOGS_DIR);

  const stamp = toCompactStamp(); // YYYYMMDD-HHmm
  const baseName = `${stamp}_${actionId}.md`;
  const logPath = await uniquePath(vault, `${LOGS_DIR}/${baseName}`);
  const startedAt = toLocalIsoMinute();
  const logId = `${stamp}_${actionId}`;

  const {
	actionVersion = "",
	csvFileName = "",
	csvRows = 0,
	tableRowsBefore = 0,
  } = opts;

  const yaml = [
	'---',
	`log_id: "${logId}"`,
	`action_id: "${actionId}"`,
	`action_version: "${actionVersion}"`,
	`started_at: "${startedAt}"`,
	`finished_at: ""`,
	`duration_ms: 0`,
	`status: ""`, // success | cancel | error
	`error_message: ""`,
	`csv_file: "${csvFileName ? `[[${csvFileName}]]` : ""}"`,
	`csv_sha1: ""`,
	`csv_rows: ${csvRows ?? 0}`,
	`table_rows_before: ${tableRowsBefore ?? 0}`,
	`table_rows_after: 0`,
	`diff_counts:`,
	`  nouveaux_tags: 0`,
	`  id_update: 0`,
	`  name_update: 0`,
	`  count_update: 0`,
	`  tags_a_creer: 0`,
	`  tags_a_modifier: 0`,
	`  problemes: 0`,
	`applied_counts:`,
	`  nouveaux_tags: 0`,
	`  id_update: 0`,
	`  name_update: 0`,
	`  count_update: 0`,
	`backup_path: ""`,
	`wp_update_after: false`,
	'---',
	'',
	'## Entrées',
	'### CSV (brut)',
	'```csv',
	'# (à remplir via appendSection)',
	'```',
	'',
	'### Table locale (brut)',
	'```md',
	'# (à remplir via appendSection)',
	'```',
	'',
	'## Diff (copie de la modale)',
	'### Nouveaux tags (n=0)',
	'',
	'### ID update (n=0)',
	'',
	'### Name update (n=0)',
	'',
	'### Count update (n=0)',
	'',
	'### Tags à créer (info seule) (n=0)',
	'',
	'### Tags à modifier (info seule) (n=0)',
	'',
	'### Problèmes (info seule) (n=0)',
	'',
	'## Sorties (si “Appliquer”)',
	'- **Sélection appliquée**: []',
	'',
	'```md',
	'# Table finale après application (optionnel)',
	'```',
	'',
	'## Erreurs',
	'-',
	'',
  ].join('\n');

  await vault.create(normalizePath(logPath), yaml);
  return { logPath, logId, startedAt };
}

/**
 * Ajoute une section Markdown arbitraire à la fin du log.
 * `title` devient un "## <title>" (si non vide).
 */
export async function appendSection(
  vault: Vault,
  logPath: string,
  title: string,
  bodyMd: string
): Promise<void> {
  const file = getLogFile(vault, logPath);
  if (!file) {
	console.warn("[actionLogger] log file not found for append:", logPath);
	return;
  }
  const prev = await vault.read(file);

  const parts: string[] = [];
  if (title && title.trim().length > 0) {
	parts.push(`\n## ${title.trim()}\n`);
  }
  parts.push(bodyMd.endsWith('\n') ? bodyMd : bodyMd + '\n');

  await vault.modify(file, prev + parts.join('\n'));
}

/**
 * Finalise le log: met à jour le YAML (status, durées, compteurs, backup…),
 * et peut ajouter la table finale si fournie.
 */
export async function finalizeActionLog(
  vault: Vault,
  logPath: string,
  startedAt: string,
  fin: FinalizeLogOptions
): Promise<void> {
  const file = getLogFile(vault, logPath);
  if (!file) {
	console.warn("[actionLogger] log file not found for finalize:", logPath);
	return;
  }

  const now = toLocalIsoMinute();
  const durationMs = safeDurationMs(startedAt, now);

  const raw = await vault.read(file);

  // Construire l’objet de patch YAML
  const yamlUpdates: Record<string, string | number | boolean | null> = {
	finished_at: now,
	duration_ms: durationMs,
	status: fin.status,
	error_message: fin.errorMessage ?? "",
	backup_path: fin.backupPath ? `[[${fin.backupPath}]]` : "",
	wp_update_after: !!fin.wpUpdateAfter,
	table_rows_after: fin.tableRowsAfter ?? 0,
  };

  // Compteurs diff
  if (fin.diffCounts) {
	yamlUpdates["diff_counts.nouveaux_tags"] = fin.diffCounts.nouveaux_tags ?? 0;
	yamlUpdates["diff_counts.id_update"] = fin.diffCounts.id_update ?? 0;
	yamlUpdates["diff_counts.name_update"] = fin.diffCounts.name_update ?? 0;
	yamlUpdates["diff_counts.count_update"] = fin.diffCounts.count_update ?? 0;
	yamlUpdates["diff_counts.tags_a_creer"] = fin.diffCounts.tags_a_creer ?? 0;
	yamlUpdates["diff_counts.tags_a_modifier"] = fin.diffCounts.tags_a_modifier ?? 0;
	yamlUpdates["diff_counts.problemes"] = fin.diffCounts.problemes ?? 0;
  }

  // Compteurs applied
  if (fin.appliedCounts) {
	yamlUpdates["applied_counts.nouveaux_tags"] = fin.appliedCounts.nouveaux_tags ?? 0;
	yamlUpdates["applied_counts.id_update"] = fin.appliedCounts.id_update ?? 0;
	yamlUpdates["applied_counts.name_update"] = fin.appliedCounts.name_update ?? 0;
	yamlUpdates["applied_counts.count_update"] = fin.appliedCounts.count_update ?? 0;
  }

  // Résumé YAML (facultatif) ex: { tags_last_udpdate, tags_last_csv, wp_update }
  if (fin.yamlSummary) {
	for (const [k, v] of Object.entries(fin.yamlSummary)) {
	  yamlUpdates[k] = v as any;
	}
  }

  const withYaml = applyYamlPatch(raw, yamlUpdates);
  await vault.modify(file, withYaml);

  // Ajouter la table finale si fournie
  if (fin.finalTableMd && fin.finalTableMd.trim().length > 0) {
	const updated = await vault.read(file);
	const finalBlock =
	  '\n## Sorties (si “Appliquer”)\n' +
	  '- **Table réécrite**: oui\n' +
	  '```md\n' +
	  fin.finalTableMd.trim() +
	  '\n```\n';
	await vault.modify(file, updated + '\n' + finalBlock);
  }
}
