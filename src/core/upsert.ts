// src/core/upsert.ts
import type { MasterFields } from "./types";

/** Petit contrat d’I/O (injecté par l’action) pour éviter la dépendance directe à Obsidian. */
export interface VaultIO {
  /** Teste si un chemin absolu existe. */
  exists(absPath: string): Promise<boolean>;
  /** Lit un fichier texte en absolu. */
  read(absPath: string): Promise<string>;
  /** Écrit un fichier texte en absolu (écrasement). */
  write(absPath: string, data: string): Promise<void>;
  /** (Optionnel) Retourne la liste de TOUS les chemins .md de la vault (absolus). */
  listMarkdownPaths?(): Promise<string[]>;
}

/**
 * Retrouve une note par `post_id` (champ YAML maître).
 * Court-terme: scan des .md si `listMarkdownPaths` est fourni; sinon `undefined`.
 * NB: recherche naïve via frontmatter, suffisante pour un 1er jet.
 */
export async function findNoteByPostId(
  postId: string,
  io: VaultIO
): Promise<{ path: string } | undefined> {
  if (!io.listMarkdownPaths) return undefined;
  const all = await io.listMarkdownPaths();
  const wanted = String(postId).trim();

  // Regex simple frontmatter + clé post_id:
  const fmRe = /^---\n([\s\S]*?)\n---/;
  const lineRe = /^[ \t]*post_id:[ \t]*(.+?)\s*$/m;

  for (const absPath of all) {
	// optimisation simple: ne lire que les .md
	if (!absPath.toLowerCase().endsWith(".md")) continue;
	try {
	  const txt = await io.read(absPath);
	  const m = txt.match(fmRe);
	  if (!m) continue;
	  const fm = m[1];
	  const l = fm.match(lineRe);
	  if (!l) continue;
	  const value = String(l[1] ?? "").replace(/^"|"$/g, "").trim();
	  if (value === wanted) return { path: absPath };
	} catch {
	  // ignore erreurs de lecture
	}
  }
  return undefined;
}

/** Écrit la note à `absPath` avec le YAML maître (et un corps facultatif, par défaut vide). */
export async function writeNote(
  absPath: string,
  yamlFrontmatter: string,
  body: string = ""
): Promise<void> {
  // On garantit que le YAML fourni a déjà ses '---' en tête et en pied.
  const content = `${yamlFrontmatter}\n${body ?? ""}`.replace(/\s+$/,"") + "\n";
  await ioWriteGuard(absPath, content, (p, d) => {
	throw new Error(`writeNote: no writer provided for "${p}".`);
  });
}

/** Petit garde-fou pour factoriser l’appel à l’I/O écriture via closure. */
async function ioWriteGuard(
  absPath: string,
  data: string,
  writer: (p: string, d: string) => Promise<void>
): Promise<void> {
  // Ici on ne fait rien de plus; ce point d’extension permettrait d’ajouter des hooks si besoin.
  await writer(absPath, data);
}
