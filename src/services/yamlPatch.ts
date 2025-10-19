// src/services/yamlPatch.ts
// 1) applyYamlPatch: Patch YAML frontmatter en conservant les types (bool, number, string) via js-yaml.
// 2) patchTagsAndMaj: Patch ciblé des tags qui PRÉSERVE le YAML maître (sections, ordre) et force maj_wp: true si changement.
// 3) setWpImportBlock / patchWpImportBlock: écriture des champs WP-IMPORT (anti-régression CSV) en mémoire ou sur fichier.

import { load as yamlLoad, dump as yamlDump } from "js-yaml";
import type { VaultIO } from "@core/upsert";
import { YAML_SECTION_LINES } from "@core/yamlMaster";

/** Applique des mises à jour sur le YAML frontmatter d’un fichier Markdown.
 * - `updates` peut contenir des chemins en dot-notation (ex: "diff_counts.nouveaux_tags": 3).
 * - Les booléens et nombres sont conservés comme types natifs (pas de guillemets).
 * - Si le document n’a pas de YAML, on en crée un minimal avec uniquement les clés mises à jour.
 * - ⚠️ Cette fonction ré-émet le YAML sans les lignes de sections (IMAGES:/LIEN:/MAJ:/POST:/WP:).
 *   Si tu veux préserver ces sections, utilise patchTagsAndMaj pour le cas des tags
 *   ou patchWpImportBlock pour WP-IMPORT.
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

/* -------------------- Helpers applyYamlPatch -------------------- */

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

/* =================================================================================================
   patchTagsAndMaj — Préserve les sections YAML maître et force maj_wp: true uniquement si TAGS changent
================================================================================================= */

/**
 * Met à jour la clé YAML `tags` (liste de slugs).
 * - Si la liste finale diffère de l’existante (ordre compris), écrit le fichier ET force `maj_wp: true`.
 * - Sinon, ne modifie rien.
 * - Préserve les lignes de sections du YAML maître (IMAGES:/LIEN:/MAJ:/POST:/WP:).
 */
export async function patchTagsAndMaj(
  noteAbsPath: string,
  nextTags: string[],
  io: VaultIO
): Promise<"changed" | "unchanged"> {
  const raw = await io.read(noteAbsPath);
  const { fmStart, fmEnd, fm, body } = tagsPatch_extractFrontmatter(raw);

  // Normalise/déduplique correctement côté entrée
  const desired = tagsPatch_dedupeKeepOrder(
	nextTags.map(s => String(s).trim()).filter(Boolean)
  );

  if (!fm) {
	// Pas de frontmatter → on crée un FM minimal respectant les sections YAML maître (MAJ/POST)
	const minimal = tagsPatch_buildMinimalFrontmatter(desired);
	await io.write(noteAbsPath, minimal + "\n" + body);
	return "changed";
  }

  // Lire l'état courant des tags (respecte les blocs list)
  const current = tagsPatch_parseTagsFromFrontmatter(fm);

  // Si identiques (même ordre), ne rien faire
  if (tagsPatch_arraysEqual(current, desired)) {
	return "unchanged";
  }

  // Remplacer le bloc tags dans le YAML existant (sans casser les sections)
  const fmTagsPatched = tagsPatch_replaceTagsBlock(fm, desired);

  // Forcer maj_wp: true (remplacer ou insérer, idéalement sous la section MAJ)
  const fmFinal = tagsPatch_setMajWpTrue(fmTagsPatched);

  // Ré-assembler le document avec le YAML patché et le body original
  const next = tagsPatch_assembleDocument(raw, fmStart, fmEnd, fmFinal);
  await io.write(noteAbsPath, next);
  return "changed";
}

/* ───────────────────────────── helpers patchTagsAndMaj (préfixés) ───────────────────────────── */

function tagsPatch_extractFrontmatter(src: string): { fmStart: number; fmEnd: number; fm: string | null; body: string } {
  const text = src.replace(/\r\n?/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fmStart: -1, fmEnd: -1, fm: null, body: text };
  const full = m[0];
  const fm = m[1] ?? "";
  const fmStart = m.index ?? 0;
  const fmEnd = fmStart + full.length;
  const body = text.slice(fmEnd);
  return { fmStart, fmEnd, fm, body };
}

function tagsPatch_buildMinimalFrontmatter(tags: string[]): string {
  const out: string[] = [];
  out.push("---");
  out.push(YAML_SECTION_LINES.MAJ);
  out.push("maj_wp: true");
  out.push(YAML_SECTION_LINES.POST);
  if (!tags.length) out.push("tags: []");
  else {
	out.push("tags:");
	for (const t of tags) out.push(`- ${t}`);
  }
  out.push("---");
  return out.join("\n");
}

function tagsPatch_parseTagsFromFrontmatter(fm: string): string[] {
  const lines = fm.replace(/\r\n?/g, "\n").split("\n");
  const acc: string[] = [];
  for (let i = 0; i < lines.length; i++) {
	const L = lines[i];
	if (/^[ \t]*tags[ \t]*:\s*\[\s*\]\s*$/.test(L)) return [];
	if (/^[ \t]*tags[ \t]*:\s*$/.test(L)) {
	  for (let j = i + 1; j < lines.length; j++) {
		const Lj = lines[j];
		if (/^[ \t]*- /.test(Lj)) {
		  const item = Lj.replace(/^[ \t]*-\s*/, "");
		  acc.push(tagsPatch_unquote(item.trim()));
		} else break;
	  }
	  break;
	}
  }
  return tagsPatch_dedupeKeepOrder(acc);
}

function tagsPatch_replaceTagsBlock(fm: string, tags: string[]): string {
  const lines = fm.replace(/\r\n?/g, "\n").split("\n");
  let start = -1, end = -1;

  // Chercher "tags:" (ligne seule), "tags: []" ou "tags: [a, b]" (on remplace dans tous les cas)
  for (let i = 0; i < lines.length; i++) {
	const L = lines[i];
	if (/^[ \t]*tags[ \t]*:/.test(L)) {
	  start = i;
	  if (/^[ \t]*tags[ \t]*:\s*\[\s*\]\s*$/.test(L)) {
		end = i;
	  } else if (/^[ \t]*tags[ \t]*:\s*$/.test(L)) {
		let j = i + 1;
		while (j < lines.length && /^[ \t]*- /.test(lines[j])) j++;
		end = j - 1;
	  } else {
		// ex.: "tags: [a, b]" → on remplace la ligne
		end = i;
	  }
	  break;
	}
  }

  const block: string[] = !tags.length
	? ["tags: []"]
	: ["tags:", ...tags.map(t => `- ${t}`)];

  if (start === -1) {
	// Pas de 'tags:' → insérer de préférence juste après la section POST, sinon à la fin du FM
	const postIdx = lines.findIndex(l => /^POST:/.test(l));
	return (postIdx >= 0)
	  ? tagsPatch_insertAfter(lines, postIdx, block).join("\n")
	  : lines.concat(block).join("\n");
  }

  return [
	...lines.slice(0, start),
	...block,
	...lines.slice(end + 1),
  ].join("\n");
}

function tagsPatch_setMajWpTrue(fm: string): string {
  const lines = fm.replace(/\r\n?/g, "\n").split("\n");

  // Si un maj_wp existe déjà → remplace
  for (let i = 0; i < lines.length; i++) {
	if (/^[ \t]*maj_wp[ \t]*:/.test(lines[i])) {
	  lines[i] = "maj_wp: true";
	  return lines.join("\n");
	}
  }

  // Sinon, insérer dans la section MAJ si existante, sinon en tête du YAML
  const majIdx = lines.findIndex(l => /^MAJ:/.test(l));
  return (majIdx >= 0)
	? tagsPatch_insertAfter(lines, majIdx, ["maj_wp: true"]).join("\n")
	: ["maj_wp: true", ...lines].join("\n");
}

function tagsPatch_assembleDocument(src: string, fmStart: number, fmEnd: number, fmNew: string): string {
  const text = src.replace(/\r\n?/g, "\n");
  return `${text.slice(0, fmStart)}---\n${fmNew}\n---\n${text.slice(fmEnd)}`;
}

function tagsPatch_insertAfter(lines: string[], index: number, block: string[]): string[] {
  return lines.slice(0, index + 1).concat(block, lines.slice(index + 1));
}

function tagsPatch_unquote(s: string): string {
  const dq = s.match(/^"(.*)"$/);
  if (dq) return dq[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const sq = s.match(/^'(.*)'$/);
  if (sq) return sq[1];
  return s;
}

function tagsPatch_arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function tagsPatch_dedupeKeepOrder(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
	if (!v) continue;
	if (seen.has(v)) continue;
	seen.add(v);
	out.push(v);
  }
  return out;
}

/* =================================================================================================
   WP-IMPORT — écriture des champs anti-régression (famille / ID) en mémoire ou sur fichier
================================================================================================= */

/**
 * Écrit en mémoire (objet frontmatter) les 2 clés WP-IMPORT.
 * À utiliser quand tu disposes déjà d'un FM objet (ex: pendant la construction du YAML).
 */
export function setWpImportBlock(
  fm: Record<string, any>,
  data: { datasetKey: string; datasetId: number }
): void {
  fm["wp_import_dataset_key"] = data.datasetKey;
  fm["wp_import_dataset_id"] = Number(data.datasetId);
}

/**
 * Patch sur fichier (préserve les sections YAML maître).
 * - Crée ou remplace le bloc sous la section "WP-IMPORT".
 * - Retourne "unchanged" si les deux valeurs étaient déjà identiques.
 */
export async function patchWpImportBlock(
  noteAbsPath: string,
  datasetKey: string,
  datasetId: number,
  io: VaultIO
): Promise<"changed" | "unchanged"> {
  const raw = await io.read(noteAbsPath);
  const { fmStart, fmEnd, fm, body } = tagsPatch_extractFrontmatter(raw);

  const desiredKey = String(datasetKey);
  const desiredId = Number(datasetId);

  if (!fm) {
	// Pas de frontmatter → on crée un FM minimal avec WP-IMPORT uniquement.
	const minimal = wpImport_buildMinimalFrontmatter(desiredKey, desiredId);
	await io.write(noteAbsPath, minimal + "\n" + body);
	return "changed";
  }

  const current = wpImport_parseValues(fm);
  if (current.key === desiredKey && current.id === desiredId) {
	return "unchanged";
  }

  const fmFinal = wpImport_replaceOrInsertBlock(fm, desiredKey, desiredId);
  const next = tagsPatch_assembleDocument(raw, fmStart, fmEnd, fmFinal);
  await io.write(noteAbsPath, next);
  return "changed";
}

/* ─────────────────────────── helpers WP-IMPORT (préfixés) ─────────────────────────── */

function wpImport_buildMinimalFrontmatter(key: string, id: number): string {
  const header = YAML_SECTION_LINES.WP_IMPORT
	?? "WP-IMPORT: ______________________________________________________________________";
  const out: string[] = [];
  out.push("---");
  out.push(header);
  out.push(`wp_import_dataset_key: ${key}`);
  out.push(`wp_import_dataset_id: ${id}`);
  out.push("---");
  return out.join("\n");
}

function wpImport_parseValues(fm: string): { key?: string; id?: number } {
  const lines = fm.replace(/\r\n?/g, "\n").split("\n");
  let key: string | undefined;
  let id: number | undefined;

  for (const L of lines) {
	const mKey = L.match(/^[ \t]*wp_import_dataset_key[ \t]*:\s*(.+)\s*$/);
	if (mKey && !key) key = stripQuotes(mKey[1]);

	const mId = L.match(/^[ \t]*wp_import_dataset_id[ \t]*:\s*(\d+)\s*$/);
	if (mId && id === undefined) id = Number(mId[1]);
  }

  return { key, id };
}

function wpImport_replaceOrInsertBlock(fm: string, key: string, id: number): string {
  const lines = fm.replace(/\r\n?/g, "\n").split("\n");

  const headerIdx = lines.findIndex(l => /^WP-IMPORT:/.test(l));
  let keyIdx = -1;
  let idIdx = -1;

  for (let i = 0; i < lines.length; i++) {
	const L = lines[i];
	if (keyIdx < 0 && /^[ \t]*wp_import_dataset_key[ \t]*:/.test(L)) keyIdx = i;
	if (idIdx < 0 && /^[ \t]*wp_import_dataset_id[ \t]*:/.test(L)) idIdx = i;
  }

  // Remplacements si déjà présents
  if (keyIdx >= 0) lines[keyIdx] = `wp_import_dataset_key: ${key}`;
  if (idIdx >= 0) lines[idIdx] = `wp_import_dataset_id: ${id}`;

  // Si l'un ou l'autre manque, on (ré)insère proprement sous WP-IMPORT ou à défaut en fin de FM
  const missing: string[] = [];
  if (keyIdx < 0) missing.push(`wp_import_dataset_key: ${key}`);
  if (idIdx < 0) missing.push(`wp_import_dataset_id: ${id}`);

  if (missing.length > 0) {
	if (headerIdx >= 0) {
	  return tagsPatch_insertAfter(lines, headerIdx, missing).join("\n");
	} else {
	  const header = YAML_SECTION_LINES.WP_IMPORT
		?? "WP-IMPORT: ______________________________________________________________________";
	  return lines.concat([header, ...missing]).join("\n");
	}
  }

  return lines.join("\n");
}

function stripQuotes(s: string): string {
  const t = s.trim();
  const dq = t.match(/^"(.*)"$/);
  if (dq) return dq[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const sq = t.match(/^'(.*)'$/);
  if (sq) return sq[1];
  return t;
}
