// src/core/csv.ts
import type { WpRow } from "./types";

/**
 * Lecture CSV (UTF-8 ; séparateur `;`) → lignes typées.
 * - Ne dépend pas d'Obsidian directement : on injecte une fonction `readText(absPath)` depuis l'action.
 * - Gère guillemets `"..."`, échappement `""`, BOM UTF-8, lignes vides, fins de ligne \n/\r\n.
 * - En sortie: objets avec propriétés `header -> valeur` (cast en `WpRow` au call-site).
 */
export async function readCsv(
  absPath: string,
  readText?: (absPath: string) => Promise<string>
): Promise<WpRow[]> {
  if (!readText) {
	throw new Error("readCsv: a `readText(absPath)` reader must be provided (e.g., app.vault.adapter.read).");
  }
  let raw = await readText(absPath);

  // Enlève BOM UTF-8 si présent
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

  // Normalise fins de ligne
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // Ignore lignes vides/whitespace
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return [];

  // Header
  const headerLine = nonEmpty[0];
  const headers = splitSemicolonCsvLine(headerLine);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
	const line = nonEmpty[i];
	const fields = splitSemicolonCsvLine(line);

	// Autorise lignes plus courtes (champs manquants -> "")
	const row: Record<string, string> = {};
	for (let c = 0; c < headers.length; c++) {
	  const key = String(headers[c] ?? "").trim();
	  const val = String(fields[c] ?? "");
	  row[key] = val;
	}
	rows.push(row);
  }

  // Cast souple -> WpRow (les clés présentes dans le CSV mapperont côté mapping)
  return rows as unknown as WpRow[];
}

/** Découpe une ligne CSV (séparateur `;`) en respectant les guillemets et l’échappement `""`. */
function splitSemicolonCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
	const ch = line[i];

	if (inQuotes) {
	  if (ch === '"') {
		// Échappement "" -> "
		if (i + 1 < line.length && line[i + 1] === '"') {
		  cur += '"';
		  i++;
		} else {
		  inQuotes = false;
		}
	  } else {
		cur += ch;
	  }
	  continue;
	}

	// hors guillemets
	if (ch === '"') {
	  inQuotes = true;
	  continue;
	}
	if (ch === ";") {
	  out.push(cur);
	  cur = "";
	  continue;
	}
	cur += ch;
  }
  out.push(cur);

  // Trim doux champ par champ (sans supprimer espaces intentionnels dans champs quotés déjà interprétés)
  return out.map(s => s.trim());
}
