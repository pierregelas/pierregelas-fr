// src/core/log.ts
import type { ImportLineLog, ImportSummary } from "./types";

export interface ImportRun {
  startAt: number;
  lines: ImportLineLog[];
}

export function startRun(): ImportRun {
  return { startAt: Date.now(), lines: [] };
}

export function logLine(run: ImportRun, entry: ImportLineLog): void {
  run.lines.push(entry);
}

export function finishRun(run: ImportRun): ImportSummary {
  let created = 0, updated = 0, errors = 0;
  for (const l of run.lines) {
	if (l.status === "created") created++;
	else if (l.status === "updated") updated++;
	else if (l.status === "error") errors++;
  }
  return { created, updated, errors, lines: run.lines };
}
