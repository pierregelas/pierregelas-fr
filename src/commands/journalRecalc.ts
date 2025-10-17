// src/commands/journalRecalc.ts
// Commande: "Journal → Recalculer titres depuis post_titre_1"

import type { Plugin, TFile } from "obsidian";
import { Notice } from "obsidian";

import { formatDateToFrenchDayOnly } from "../services/dateUtils";
import { buildFullTitle } from "../services/titleUtils";
import { buildArchivesLinkTitle, buildRestesLinkTitle } from "../services/journalUtils";
import { applyYamlPatch } from "../services/yamlPatch";
import { isJournalPhotoCategory } from "../services/archivesUtils";

export function registerJournalRecalcCommand(plugin: Plugin): void {
  plugin.addCommand({
	id: "recalc-journal-from-titre1",
	name: "Journal → Recalculer titres depuis post_titre_1",
	callback: async () => {
	  const { app } = plugin;

	  // 0) Fichier courant
	  const file = app.workspace.getActiveFile();
	  if (!file) {
		new Notice("Aucun fichier actif.", 5000);
		return;
	  }

	  // 1) Lire YAML + précondition Journal photo
	  const fm = getFrontmatter(app, file);
	  if (!fm) {
		new Notice("Aucun frontmatter YAML détecté.", 5000);
		return;
	  }
	  if (!isJournalPhotoCategory(fm.post_cat)) {
		new Notice("Cette note n'est pas une note Journal Photo !", 6000);
		return;
	  }

	  const postTitre1 = str(fm.post_titre_1);
	  const postDateIso = str(fm.post_date);

	  if (!postTitre1) {
		new Notice("`post_titre_1` est vide — rien à recalculer.", 5000);
		return;
	  }
	  if (!postDateIso) {
		new Notice("`post_date` manquant — impossible de recalculer `post_titre_2`.", 6000);
		return;
	  }

	  // 2) Dérivations Journal (depuis post_titre_1 + post_date)
	  const jourSansHeure = formatDateToFrenchDayOnly(postDateIso, true); // "samedi 23 novembre 2024."
	  if (!jourSansHeure) {
		new Notice("Format de `post_date` invalide — recalcul annulé.", 6000);
		return;
	  }

	  const postTitre2 = `Journal du ${jourSansHeure}`; // sans l'heure
	  const postTitreFull = buildFullTitle(postTitre1, postTitre2);
	  const lienArchives = buildArchivesLinkTitle(postTitreFull); // [[...]]
	  const lienRestes = buildRestesLinkTitle(postTitreFull);     // [[...]]
	  const img_alt = postTitre1;
	  const img_legende = postTitreFull;

	  // 3) Patch YAML in-place (préserve ordre + séparateurs)
	  try {
		const content = await app.vault.read(file);
		const updates: Record<string, string> = {
		  post_titre_2: postTitre2,
		  post_titre_full: postTitreFull,
		  img_alt,
		  img_legende,
		  lien_archives: lienArchives,
		  lien_restes: lienRestes,
		};
		const patched = applyYamlPatch(content, updates);
		if (patched === content) {
		  // même contenu: pas de modif de YAML, on peut malgré tout renommer si nécessaire
		} else {
		  await app.vault.modify(file, patched);
		}

		// 4) Renommer la note si le nom ≠ post_titre_full
		const currentName = basenameNoExt(file.name);
		if (currentName !== postTitreFull) {
		  await app.vault.rename(file, `${postTitreFull}.md`);
		  new Notice("Journal mis à jour + renommage du fichier effectué.", 4000);
		} else {
		  new Notice("Journal mis à jour.", 3000);
		}
	  } catch (err: any) {
		console.error("[pierregelas-fr] Journal recalc error:", err);
		new Notice(`Erreur lors du recalcul : ${err?.message ?? err}`, 8000);
	  }
	},
  });
}

/* -------------------- helpers -------------------- */

function getFrontmatter(app: Plugin["app"], file: TFile): Record<string, unknown> | null {
  const cache = app.metadataCache.getFileCache(file);
  const fm = cache?.frontmatter;
  if (!fm) return null;
  const out: Record<string, unknown> = {};
  for (const k in fm) {
	if (k && k !== "position") out[k] = (fm as any)[k];
  }
  return out;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function basenameNoExt(name: string): string {
  return name.replace(/\.md$/i, "");
}
