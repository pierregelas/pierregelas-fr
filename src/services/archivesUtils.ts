// src/services/archivesUtils.ts
// Implémentation — utilitaires spécifiques à "Archives du futur" (Processus 1)

/**
 * Vérifie la précondition : la note source est bien un "Journal photo".
 * Règle : post_cat doit contenir "journal-photo".
 */
export function isJournalPhotoCategory(postCat: unknown): boolean {
  if (postCat == null) return false;

  // post_cat peut être: string | string[] | autre (on reste robustes)
  if (typeof postCat === "string") {
	return eqJournalPhoto(postCat);
  }
  if (Array.isArray(postCat)) {
	return postCat.some((x) => typeof x === "string" && eqJournalPhoto(x));
  }
  return false;

  function eqJournalPhoto(x: string): boolean {
	return x.trim().toLowerCase() === "journal-photo";
  }
}

/**
 * À partir du texte du lien wiki "lien_archives" (sans [[ ]]),
 * déduit les trois champs de titre de la note "Archives du futur".
 *
 * Règle :
 * - post_titre_1 : la partie AVANT "Archives", terminée par un point.
 * - post_titre_2 : la partie DEPUIS "Archives" (inclus) jusqu'à la fin (ex: "Archives du dimanche 26 janvier 2024 ?").
 * - post_titre_full : le titre complet (identique au texte du lien).
 */
export function deriveArchivesTitlesFromLinkText(
  linkText: string
): { postTitre1: string; postTitre2: string; postTitreFull: string } {
  const full = (linkText ?? "").trim();
  if (!full) return { postTitre1: "", postTitre2: "", postTitreFull: "" };

  const idx = full.indexOf("Archives");
  if (idx < 0) {
	// Sécurité : si "Archives" n'est pas trouvé, on met tout en titre_1 (terminé par un point)
	return {
	  postTitre1: ensureEndingDot(full),
	  postTitre2: "",
	  postTitreFull: full,
	};
  }

  const before = full.slice(0, idx).trim();
  const after = full.slice(idx).trim(); // commence par "Archives..."

  return {
	postTitre1: ensureEndingDot(before),
	postTitre2: after,
	postTitreFull: full,
  };
}

/**
 * Construit le nom de l'image Archives (depuis l'image Journal),
 * en remplaçant systématiquement le suffixe "_WP" par "_BF".
 * Ex: ..._WP.webp → ..._BF.webp
 */
export function toBfImageNameFromWp(imgFilenameFromJournal: string): string {
  if (typeof imgFilenameFromJournal !== "string") return "";
  return imgFilenameFromJournal.replace(/_WP/g, "_BF");
}

export function toReiImageNameFromWp(imgFilenameFromJournal: string): string {
  if (typeof imgFilenameFromJournal !== "string") return "";
  return imgFilenameFromJournal.replace(/_WP/g, "_REI");
}

/* -------------------- helpers -------------------- */

function ensureEndingDot(s: string): string {
  if (!s) return "";
  const trimmed = s.trim();
  // ✅ Si ça finit déjà par ., ! ou ?, on ne rajoute rien
  if (/[.!?]$/.test(trimmed)) return trimmed;
  // Sinon on ajoute un point final
  return trimmed + ".";
}

/**
 * Dérive les titres pour "Restes du futur" depuis le texte du lien (sans [[ ]]).
 * Règle identique à Archives, mais avec le mot-clé "Restes".
 * - post_titre_1 : partie AVANT "Restes", terminée par un point sauf si déjà ?/!
 * - post_titre_2 : depuis "Restes" (inclus) jusqu'à la fin (ex: "Restes du dimanche 26 janvier 2024 ?")
 * - post_titre_full : texte complet du lien
 */
export function deriveRestesTitlesFromLinkText(
  linkText: string
): { postTitre1: string; postTitre2: string; postTitreFull: string } {
  const full = (linkText ?? "").trim();
  if (!full) return { postTitre1: "", postTitre2: "", postTitreFull: "" };

  const idx = full.indexOf("Restes");
  if (idx < 0) {
	return {
	  postTitre1: ensureEndingDot(full),
	  postTitre2: "",
	  postTitreFull: full,
	};
  }

  const before = full.slice(0, idx).trim();
  const after = full.slice(idx).trim();
  return {
	postTitre1: ensureEndingDot(before),
	postTitre2: after,
	postTitreFull: full,
  };
}
