// src/core/importGuard.ts
// Anti-régression: recherche, pour une dataset_key donnée, l'ID d'import maximal
// en scannant les frontmatters des fichiers markdown de la vault.

import type { App, TFile } from "obsidian";

export interface LatestImportInfo {
  latestId?: number;
  file?: TFile; // note qui contient le max (optionnel, pour debug/usage futur)
}

/**
 * Scanne la vault et retourne le max de `wp_import_dataset_id`
 * pour une `wp_import_dataset_key` donnée.
 */
export async function findLatestImportId(app: App, datasetKey: string): Promise<LatestImportInfo> {
  const files = app.vault.getMarkdownFiles();
  let latestId: number | undefined;
  let latestFile: TFile | undefined;

  for (const f of files) {
	const cache = app.metadataCache.getFileCache(f);
	const fm = cache?.frontmatter as any | undefined;
	if (!fm) continue;

		const key = fm["wp_import_dataset_key"];
		const rawId = fm["wp_import_dataset_id"];
		const id =
		  typeof rawId === "number"
			? rawId
			: typeof rawId === "string" && /^\d+$/.test(rawId.trim())
			? Number(rawId.trim())
			: undefined;

		if (key === datasetKey && typeof id === "number" && Number.isFinite(id)) {
		  if (latestId === undefined || id > latestId) {
				latestId = id;
				latestFile = f;
	  }
	}
  }
  return { latestId, file: latestFile };
}

/** Compare deux IDs (YYYYMMDD en entier). */
export function isRegression(selectedId: number, latestId?: number): boolean {
  if (latestId === undefined) return false;        // aucun import connu → pas de blocage
  if (!Number.isFinite(selectedId)) return true;   // CSV non valide → bloquer par prudence (devrait être catché avant)
  return selectedId < latestId;                    // vrai si régression
}
