// src/services/fileUtils.ts
// Implémentation — création de fichier .md avec YAML + corps

import type { TFile, Vault, TAbstractFile } from "obsidian";

export interface CreateNoteOptions {
  /** Dossier cible dans le vault (optionnel). Ex: "Minutes" */
  folder?: string;
}

/**
 * Crée un fichier .md avec un bloc YAML et un corps.
 * - `yaml` doit déjà contenir les délimiteurs `---` d'ouverture/fermeture.
 * - `body` ne doit PAS contenir de YAML.
 * - `filename` est le nom du fichier SANS extension (".md" sera ajouté).
 *
 * Si le fichier existe déjà, la fonction LÈVE une erreur (pas d’écrasement silencieux).
 * Retourne le TFile créé.
 */
export async function createNoteFile(
  vault: Vault,
  filename: string,
  yaml: string,
  body: string,
  opts: CreateNoteOptions = {}
): Promise<TFile> {
  const safeName = sanitizePathSegment(filename);
  const dir = (opts.folder ?? "").trim();
  const basePath = dir ? `${trimSlashes(dir)}/${safeName}.md` : `${safeName}.md`;

  // Vérifier existence
  const existing = vault.getAbstractFileByPath(basePath);
  if (existing) {
	throw new Error(`Le fichier existe déjà: ${basePath}`);
  }

  // S'assurer que le dossier existe si fourni
  if (dir) {
	await ensureFolder(vault, trimSlashes(dir));
  }

  // Assembler contenu
  const yamlBlock = yaml.endsWith("\n") ? yaml : yaml + "\n";
  const bodyBlock = body.startsWith("\n") ? body.slice(1) : body;
  const content = `${yamlBlock}\n${bodyBlock}\n`;

  // Créer le fichier
  const file = await vault.create(basePath, content);
  return file;
}

/** Remplace les séparateurs et nettoie grossièrement un segment de chemin (nom de fichier). */
function sanitizePathSegment(name: string): string {
  return (name ?? "")
	.trim()
	// Interdire les séparateurs de chemin
	.replace(/[\/\\]/g, " - ")
	// Nettoyage léger des caractères de contrôle
	.replace(/[\u0000-\u001F\u007F]/g, "")
	// Trim final
	.replace(/\s+/g, " ")
	.trim();
}

/** Supprime les / en début/fin pour un dossier */
function trimSlashes(path: string): string {
  return (path ?? "").replace(/^\/+|\/+$/g, "");
}

/** Crée récursivement un dossier s'il n'existe pas. */
async function ensureFolder(vault: Vault, folderPath: string): Promise<void> {
  const parts = folderPath.split("/").filter(Boolean);
  let currentPath = "";
  for (const part of parts) {
	currentPath = currentPath ? `${currentPath}/${part}` : part;
	const maybe = vault.getAbstractFileByPath(currentPath);
	if (!maybe) {
	  await vault.createFolder(currentPath);
	} else {
	  // si c'est un fichier, on lève
	  if (!isFolder(maybe)) {
		throw new Error(`Chemin non valide (un fichier existe déjà) : ${currentPath}`);
	  }
	}
  }
}

function isFolder(entry: TAbstractFile): boolean {
  // Heuristique : dans l'API d'Obsidian, les dossiers ne sont pas TFile (pas d'extension)
  return !(entry as TFile).extension;
}
