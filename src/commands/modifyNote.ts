// src/commands/modifyNote.ts
// Commande palette: "Modifier une note (v0.1 tags)"
// - Note active obligatoire (TFile .md)
// - Charge la table /wp_tags/ob_tags_table.md (colonne ob_tags_slug)
// - Ouvre la modale d’édition (saisie + autocomplétion + chips)
// - À "Enregistrer": patch tags + maj_wp: true si et seulement si la liste a changé

import { App, Notice, TFile, FileSystemAdapter } from "obsidian";
import type { VaultIO } from "@core/upsert";
import { TagsSelectModal } from "../modals/tagsSelectModal";
import { loadObsTagSlugs } from "../services/tagsTable";
import { patchTagsAndMaj } from "../services/yamlPatch";

/* ───────────────────────────── helpers chemins ABS/REL ───────────────────────────── */

function getVaultRootAbs(app: App): string {
  const ad = app.vault.adapter;
  if (ad instanceof FileSystemAdapter) return ad.getBasePath().replace(/[\/\\]+$/, "");
  throw new Error("FileSystemAdapter requis (desktop).");
}

/** Convertit un chemin "absolu-like" (commençant par base, ou par "/") en chemin relatif à la vault. */
function toRelFromAbsLike(app: App, absLike: string): string {
  const base = getVaultRootAbs(app);
  if (absLike.startsWith(base)) return absLike.replace(new RegExp(`^${base}[\\/]?`), "");
  if (absLike.startsWith("/")) return absLike.replace(/^[\/\\]+/, "");
  return absLike; // déjà relatif
}

/** Renvoie le chemin ABS d’un TFile de la vault. */
function fileAbs(app: App, file: TFile): string {
  const base = getVaultRootAbs(app);
  return `${base}/${file.path}`.replace(/[\/\\]+/g, "/");
}

/** VaultIO minimal adapté à nos services (read/write/exists) */
function makeVaultIO(app: App): VaultIO {
  return {
	exists: async (absLike) => app.vault.adapter.exists(toRelFromAbsLike(app, absLike)),
	read:   async (absLike) => app.vault.adapter.read(toRelFromAbsLike(app, absLike)),
	write:  async (absLike, data) => {
	  const rel = toRelFromAbsLike(app, absLike);
	  const dir = rel.replace(/\/[^\/]+$/, "");
	  if (dir && !(await app.vault.adapter.exists(dir))) await app.vault.adapter.mkdir(dir);
	  await app.vault.adapter.write(rel, data);
	},
	// non utilisé ici
	listMarkdownPaths: async () => [],
  };
}

/* ───────────────────────────── parse tags courants ───────────────────────────── */

function extractFrontmatter(text: string): { fm: string | null } {
  const t = text.replace(/\r\n?/g, "\n");
  const m = t.match(/^---\n([\s\S]*?)\n---\n?/);
  return { fm: m ? (m[1] ?? "") : null };
}

function parseCurrentTags(fm: string | null): string[] {
  if (!fm) return [];
  const lines = fm.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
	const L = lines[i];
	if (/^[ \t]*tags[ \t]*:\s*\[\s*\]\s*$/.test(L)) return [];
	if (/^[ \t]*tags[ \t]*:\s*$/.test(L)) {
	  for (let j = i + 1; j < lines.length; j++) {
		const Lj = lines[j];
		if (/^[ \t]*- /.test(Lj)) out.push(Lj.replace(/^[ \t]*-\s*/, "").trim());
		else break;
	  }
	  break;
	}
  }
  // dédup conservant l’ordre
  const seen = new Set<string>(), res: string[] = [];
  for (const t of out) if (t && !seen.has(t)) { seen.add(t); res.push(t); }
  return res;
}

/* ───────────────────────────── registre commande ───────────────────────────── */

export function registerModifyNoteCommand(
  app: App,
  addCommand: (spec: { id: string; name: string; callback: () => void }) => void
): void {
  const io = makeVaultIO(app);

  addCommand({
	id: "modifier-tags-note", // on peut garder l'id stable
	name: "Modifier une note (v0.1 tags)",
	callback: async () => {
	  try {
		const file = app.workspace.getActiveFile();
		if (!file || !(file instanceof TFile) || file.extension.toLowerCase() !== "md") {
		  new Notice("Aucune note Markdown active.");
		  return;
		}

		// Lire note
		const noteText = await io.read(fileAbs(app, file));
		const current = parseCurrentTags(extractFrontmatter(noteText).fm);

		// Charger table des slugs autorisés
		let allowed: string[] = [];
		let disabledInfo: string | null = null;
		try {
		  allowed = await loadObsTagSlugs(io, "/wp_tags/ob_tags_table.md");
		} catch (e: any) {
		  disabledInfo = String(e?.message ?? "Table des tags introuvable.");
		}

		// Ouvrir modale
		const modal = new TagsSelectModal(app, {
		  allowed,
		  initial: current,
		  disabledInfo,
		  title: "Modifier une note (v0.1 tags)",
		  labels: { cancel: "Annuler", save: "Enregistrer", inputPlaceholder: "Ajouter un tag…" },
		});

		const selection = await modal.openAndGetSelection();
		if (!selection) return; // annulé

		// Appliquer patch (écrit seulement si changement; force maj_wp: true)
		const status = await patchTagsAndMaj(fileAbs(app, file), selection, io);
		new Notice(
		  status === "changed" ? "Tags mis à jour (maj_wp: true)." : "Aucun changement (aucune écriture)."
		);
	  } catch (err: any) {
		console.error(err);
		new Notice(`Erreur: ${String(err?.message ?? err)}`);
	  }
	},
  });
}
