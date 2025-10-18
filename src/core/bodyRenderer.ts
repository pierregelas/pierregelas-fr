// src/core/bodyRenderer.ts
// Rend le corps Markdown de la note à partir du YAML maître, 100% conditionnel.
// Spéc validée: sections Vignette / Vidéo / Notes (dans cet ordre).
// - Vignette: si au moins 1 image (cover sinon 1er img_url).
// - Vidéo: si post_vid_url non vide (rendu via ![](...) comme dans le doc).
// - Notes: toujours, avec ![[<post_titre_full>_notes]]
//
// Règles de formatage:
// - Une (1) ligne vide entre sections.
// - Pas de lignes vides "fantômes" ni de trailing spaces.

import type { MasterFields } from "@core/types";

function toString(v: unknown): string {
  return (v ?? "").toString().trim();
}

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(toString).filter(Boolean);
  const s = toString(v);
  return s ? [s] : [];
}

function firstNonEmpty(arr: string[]): string | null {
  for (const s of arr) if (s) return s;
  return null;
}

/**
 * Détermine l’URL de vignette:
 * 1) cover
 * 2) 1er élément de img_url[]
 * (Optionnel: si plus tard on expose une autre source brute, on pourra l’ajouter ici.)
 */
function getVignetteUrl(master: Partial<MasterFields>): string | null {
  const cover = toString((master as any).cover);
  if (cover) return cover;

  const imgs = toArray((master as any).img_url);
  if (imgs.length > 0) return imgs[0];

  return null;
}

export function renderBodyFromMaster(master: MasterFields): string {
  const sections: string[] = [];

  // 1) Vignette (si image)
  const vignette = getVignetteUrl(master);
  if (vignette) {
	sections.push([
	  "## Vignette",
	  "",
	  `![](${vignette})`
	].join("\n"));
  }

  // 2) Vidéo (si post_vid_url)
  const postVidUrl = toString((master as any).post_vid_url);
  if (postVidUrl) {
	sections.push([
	  "## Vidéo",
	  "",
	  `![](${postVidUrl})`
	].join("\n"));
  }

  // 3) Notes (toujours)
  const titreFull = toString((master as any).post_titre_full) || "Sans titre";
  sections.push([
	"## Notes",
	"",
	`![[${titreFull}_notes]]`
  ].join("\n"));

  // Assemblage final: une ligne vide entre sections, pas de newline final superflu
  return sections.join("\n\n");
}
