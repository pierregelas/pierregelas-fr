// src/services/yamlPatch.ts
// Patch YAML frontmatter en conservant les types (bool, number, string).
// Utilise js-yaml pour parser/dumper proprement.

import { load as yamlLoad, dump as yamlDump } from "js-yaml";

/** Applique des mises à jour sur le YAML frontmatter d’un fichier Markdown.
 * - `updates` peut contenir des chemins en dot-notation (ex: "diff_counts.nouveaux_tags": 3).
 * - Les booléens et nombres sont conservés comme types natifs (pas de guillemets).
 * - Si le document n’a pas de YAML, on en crée un minimal avec uniquement les clés mises à jour.
 */
export function applyYamlPatch(
  raw: string,
  updates: Record<string, string | number | boolean | null>
): string {
  const { yaml, body } = splitYamlFrontmatter(raw ?? "");
  let obj: any = {};

  if (yaml && yaml.trim().length > 0) {
	try {
	  const parsed = yamlLoad(yaml);
	  if (parsed && typeof parsed === "object") obj = parsed;
	} catch (e) {
	  // Si le YAML existant est illisible, on repart d’un objet vide.
	  obj = {};
	}
  }

  // Appliquer les updates (support dot-notation)
  for (const [path, val] of Object.entries(updates || {})) {
	setDotPath(obj, path, val as any);
  }

  // Dump YAML propre, sans forcer de guillemets, largeur illimitée pour éviter les wraps.
  const dumped = yamlDump(obj, {
	lineWidth: -1,
	noCompatMode: true,
	// On NE force PAS les guillemets -> js-yaml choisit seulement quand nécessaire.
	// Les booléens restent true/false, les numbers restent 1234.
  }).trimEnd();

  // Reconstruire le fichier
  // (on conserve un \n entre le YAML et le corps si le corps n’est pas vide)
  if (body.length > 0) {
	return `---\n${dumped}\n---\n${body}`;
  } else {
	return `---\n${dumped}\n---\n`;
  }
}

/* -------------------- Helpers -------------------- */

/** Sépare le frontmatter YAML (sans délimiteurs) du corps Markdown. */
function splitYamlFrontmatter(raw: string): { yaml: string; body: string } {
  const text = (raw ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.startsWith("---\n")) {
	return { yaml: "", body: text };
  }
  const end = text.indexOf("\n---", 4);
  if (end < 0) {
	// Début YAML trouvé mais pas la fin → on considère tout en YAML
	const y = text.slice(4).trimEnd();
	return { yaml: y, body: "" };
  }
  const yaml = text.slice(4, end).trimEnd();
  const rest = text.slice(end + 4);
  const body = rest.startsWith("\n") ? rest.slice(1) : rest;
  return { yaml, body };
}

/** Affecte une valeur via un chemin "a.b.c". Crée les objets au besoin. */
function setDotPath(target: any, dotPath: string, value: any): void {
  if (!dotPath || typeof dotPath !== "string") return;
  const parts = dotPath.split(".");
  let cur = target;
  for (let i = 0; i < parts.length; i++) {
	const k = parts[i];
	const isLast = i === parts.length - 1;
	if (isLast) {
	  cur[k] = value;
	} else {
	  if (cur[k] == null || typeof cur[k] !== "object" || Array.isArray(cur[k])) {
		cur[k] = {};
	  }
	  cur = cur[k];
	}
  }
}
