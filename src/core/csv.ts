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
  raw = stripBom(raw);

  // Normalise fins de ligne
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // Ignore lignes vides/whitespace
  let nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return [];

  // Excel peut ajouter une ligne "sep=;" ou "sep=," en tête pour indiquer le séparateur.
  let forcedDelimiter: CsvDelimiter | undefined;
  const firstLine = stripBom(nonEmpty[0]).trim();
  const sepMatch = /^sep=([;,])$/i.exec(firstLine);
  if (sepMatch) {
		forcedDelimiter = sepMatch[1] === "," ? "," : ";";
		nonEmpty = nonEmpty.slice(1).filter(l => l.trim().length > 0);
  }

  if (nonEmpty.length === 0) return [];

  // Header
  nonEmpty[0] = stripBom(nonEmpty[0]);
  const delimiter: CsvDelimiter = forcedDelimiter ?? detectDelimiter(nonEmpty[0]);
  const headers = splitCsvLine(nonEmpty[0], delimiter);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
		const line = nonEmpty[i];
		const fields = splitCsvLine(line, delimiter);

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

type CsvDelimiter = ";" | ",";

function stripBom(value: string): string {
  if (value && value.charCodeAt(0) === 0xFEFF) {
		return value.slice(1);
  }
  return value;
}

function detectDelimiter(line: string): CsvDelimiter {
  let semi = 0;
  let comma = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
		  if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
				i++;
		  } else {
				inQuotes = !inQuotes;
		  }
		  continue;
		}
		if (inQuotes) continue;
		if (ch === ";") semi++;
		else if (ch === ",") comma++;
  }

  if (semi === 0 && comma === 0) return ";";
  return semi >= comma ? ";" : ",";
}

/** Découpe une ligne CSV en respectant les guillemets et l’échappement `""`. */
function splitCsvLine(line: string, delimiter: CsvDelimiter): string[] {
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
		if (ch === delimiter) {
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
