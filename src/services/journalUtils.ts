// src/services/journalUtils.ts
// Implémentation — utilitaires spécifiques à l'action Journal

import { extractIsoDateFromFilename, formatDateToFrenchDayOnly } from "./dateUtils";
import { extractTitleFromFilename, buildFullTitle } from "./titleUtils";

/**
 * Déduit les titres Journal à partir du nom "AAAA-MM-JJ-hh-mm - Titre…"
 * - post_titre_1 : partie après " - "
 * - post_titre_2 : "Journal du <jour date>." (SANS l'heure)
 * - post_titre_full : concat(titre1, " ", titre2)
 */
export function deriveJournalTitlesFromFilename(
  filename: string
): { postTitre1: string; postTitre2: string; postTitreFull: string } {
  const postDateIso = extractIsoDateFromFilename(filename); // "YYYY-MM-DDThh:mm:00"
  const postTitre1 = extractTitleFromFilename(filename);
  const jourSansHeure = formatDateToFrenchDayOnly(postDateIso, true); // "samedi 23 novembre 2024."
  const postTitre2 = jourSansHeure ? `Journal du ${jourSansHeure}` : "";
  const postTitreFull = buildFullTitle(postTitre1, postTitre2);
  return { postTitre1, postTitre2, postTitreFull };
}

/**
 * Extrait l'identifiant d'image à partir du nom du fichier image Journal.
 * RÈGLE FINALE (confirmée) :
 *   AAAA-MM-JJ-hh-mm_idphoto_WP.webp
 *   ex: 2024-11-23-17-05_4075037_WP.webp
 * Retourne "idphoto" → ex: "4075037", ou "" si non conforme.
 */
export function parseImageIdFromName(imageName: string): string {
  if (typeof imageName !== "string") return "";
  const s = imageName.trim();
  const m = s.match(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}_([A-Za-z0-9-]+)_WP\.webp$/i);
  return m ? m[1] : "";
}

/**
 * Construit le lien/nom de fichier "Archives du futur" depuis post_titre_full.
 * (formatage des ? etc. reste identique ; l'heure a déjà été retirée plus haut)
 */
export function buildArchivesLinkTitle(postTitreFull: string): string {
  const base = transformTitleForLink(postTitreFull, "Archives");
  return wrapWiki(base);
}

/**
 * Construit le lien/nom "Restes" depuis post_titre_full.
 */
export function buildRestesLinkTitle(postTitreFull: string): string {
  const base = transformTitleForLink(postTitreFull, "Restes");
  return wrapWiki(base);
}

/* -------------------- helpers -------------------- */

function transformTitleForLink(src: string, replaceJournalWith: "Archives" | "Restes"): string {
  if (!src) return "";

  // Remplacer . , ! par " ?"
  let s = src.replace(/[.,!]/g, " ?");

  // Remplacer "Journal" par "Archives"/"Restes"
  s = s.replace(/\bJournal\b/g, replaceJournalWith);

  // Majuscule après chaque " ?"
  s = s.replace(/\?\s*([a-zà-ÿ])/gi, (_m, c: string) => ` ? ${c.toUpperCase()}`);

  // Nettoyage espaces
  s = s.replace(/\s{2,}/g, " ").trim();

  // Point d'interrogation final si pas présent
  if (!/\?\s*$/.test(s)) s += " ?";

  return s.trim();
}

function wrapWiki(s: string): string {
  return s ? `[[${s}]]` : "";
}
