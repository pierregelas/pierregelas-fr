// src/services/validationUtils.ts
// Implémentation

/**
 * Règles de validation :
 * - Nom de fichier vidéo (Minutes/Journal) :
 *   "AAAA-MM-JJ-hh-mm - Titre…"
 *   ^\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2} - .+$
 * - Lien vidéo : URL https (YouTube/Vimeo/…)
 */

const FILENAME_RE = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2} - .+$/;

/**
 * Vérifie que le nom respecte le format :
 * AAAA-MM-JJ-hh-mm - Titre…
 * (tiret entouré d'espaces " - " entre date et titre)
 */
export function validateFilenameFormat(input: string): boolean {
  if (typeof input !== "string") return false;
  return FILENAME_RE.test(input.trim());
}

/**
 * Vérifie qu'une URL est bien une URL https valide.
 * (On reste volontairement large : toute URL https est acceptée)
 */
export function validateVideoLink(url: string): boolean {
  if (typeof url !== "string") return false;
  try {
	const u = new URL(url.trim());
	return u.protocol === "https:";
  } catch {
	return false;
  }
}

/**
 * Renvoie un message d'erreur utilisateur lisible
 * selon le champ invalidé. À utiliser dans les modales.
 */
export function validationErrorMessage(kind: "filename" | "video"): string {
  if (kind === "filename") {
	return [
	  "Format attendu :",
	  "AAAA-MM-JJ-hh-mm - Titre complet.",
	  "Exemple : 2025-06-14-15-57 - Danse et manifestation, Place Léon Blum, Paris 11e."
	].join("\n");
  }
  return "Le lien vidéo doit être une URL https valide (YouTube, Vimeo, etc.).";
}
