// src/services/imageUtils.ts
// Implémentation

/**
 * Construit le nom de fichier vignette pour l'action Minutes.
 * Règle :
 * YYYYMMDD_ + 8 premiers caractères du titre (nettoyés, minuscules) + "_mvign.webp"
 *
 * - La date est extraite du préfixe "AAAA-MM-JJ-hh-mm - ...".
 * - Le titre est la partie après " - ".
 * - Nettoyage du titre : minuscules, suppression des accents, suppression des caractères non alphanumériques.
 */
export function buildMinutesImageFilename(fromVideoFilename: string): string {
  if (typeof fromVideoFilename !== "string") return "";

  const input = fromVideoFilename.trim();

  // 1) Extraire AAAA-MM-JJ-hh-mm
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\b/);
  if (!m) return "";
  const [, YYYY, MM, DD] = m;
  const yyyymmdd = `${YYYY}${MM}${DD}`;

  // 2) Extraire la partie titre après " - "
  const sepIdx = input.indexOf(" - ");
  if (sepIdx === -1) return "";
  const rawTitle = input.slice(sepIdx + 3).trim();

  // 3) Nettoyer le titre : minuscules, sans accents, alphanum uniquement
  const cleaned = stripAccents(rawTitle)
	.toLowerCase()
	.replace(/[^a-z0-9]+/g, ""); // concatène (on retire les séparateurs)

  const eight = cleaned.slice(0, 8);

  return `${yyyymmdd}_${eight}_mvign.webp`;
}

/**
 * (Utilitaire pour Archives du futur)
 * Remplace le suffixe "_WP" par "_BF" dans un nom d'image.
 * Si "_WP" apparaît plusieurs fois, on remplace toutes les occurrences.
 */
export function toBfFromWp(imageName: string): string {
  if (typeof imageName !== "string") return "";
  return imageName.replace(/_WP/g, "_BF");
}

/** Supprime les diacritiques (accents) de manière Unicode-safe. */
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
