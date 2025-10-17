// src/services/titleUtils.ts
// Implémentation

/**
 * Extrait la partie après " - " et applique la capitalisation/ponctuation attendue.
 * Retourne post_titre_1.
 *
 * Règles :
 * - Prendre tout ce qui suit la première occurrence de " - "
 * - Trim des espaces
 * - Majuscule initiale
 * - Ajouter un point final si absent (on ne touche pas si ça finit déjà par . ! ou ?)
 */
export function extractTitleFromFilename(filename: string): string {
  if (typeof filename !== "string") return "";
  const idx = filename.indexOf(" - ");
  if (idx === -1) return "";

  let title = filename.slice(idx + 3).trim();
  if (!title) return "";

  // Majuscule initiale (Unicode-friendly)
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Point final si pas déjà présent (on laisse ! et ? intacts)
  if (!/[.!?]$/.test(title)) {
	title += ".";
  }

  return title;
}

/**
 * Concatène post_titre_1 et post_titre_2 avec un espace.
 * Retourne post_titre_full.
 */
export function buildFullTitle(title1: string, title2: string): string {
  const t1 = (title1 ?? "").trim();
  const t2 = (title2 ?? "").trim();
  if (!t1 && !t2) return "";
  if (!t1) return t2;
  if (!t2) return t1;
  return `${t1} ${t2}`;
}
