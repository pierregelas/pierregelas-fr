// src/core/csv.ts
import { parse } from "csv-parse/browser/esm/sync";
import type { WpRow } from "./types";

/**
 * Lecture CSV (UTF-8 ; séparateur `;`) → lignes typées.
 * - Ne dépend pas d'Obsidian directement : on injecte une fonction `readText(absPath)` depuis l'action.
 * - S'appuie sur `csv-parse` pour gérer correctement guillemets, champs multi-lignes, BOM, etc.
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
  raw = stripBom(raw);

  // Normalise fins de ligne pour simplifier la détection d'une éventuelle ligne `sep=`
  const normalised = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalised.split("\n");

  let forcedDelimiter: CsvDelimiter | undefined;
  let startIndex = 0;
  while (startIndex < lines.length && lines[startIndex].trim().length === 0) {
	startIndex++;
  }

  if (startIndex >= lines.length) {
	return [];
  }

  const firstLine = stripBom(lines[startIndex]).trim();
  const sepMatch = /^sep=([;,])$/i.exec(firstLine);
  if (sepMatch) {
	forcedDelimiter = sepMatch[1] === "," ? "," : ";";
	lines.splice(startIndex, 1);
  }

  const cleaned = lines.join("\n");
  if (cleaned.trim().length === 0) {
	return [];
  }

  const records = parse(cleaned, {
	columns: true,
	delimiter: forcedDelimiter ?? ";",
	skip_empty_lines: true,
	relax_quotes: true,
	bom: true,
	trim: true,
  });

  return records as unknown as WpRow[];
}

type CsvDelimiter = ";" | ",";

function stripBom(value: string): string {
  if (value && value.charCodeAt(0) === 0xfeff) {
	return value.slice(1);
  }
  return value;
}
