// src/core/transform.ts

/** Sépare sur "||", trim chaque élément, filtre les vides. */
export function splitMulti(input?: string, sep: "||" = "||"): string[] {
  if (!input) return [];
  return input
	.split(sep)
	.map(s => s.trim())
	.filter(s => s.length > 0);
}

/** "A>B>C" -> ["A","B","C"] (trim + dédup en conservant l'ordre). */
export function splitHierarchy(input?: string): string[] {
  if (!input) return [];
  const parts = input.split(">").map(s => s.trim()).filter(Boolean);
  return dedupeKeepOrder(parts);
}

/** Déduplique en conservant l'ordre initial. */
export function dedupeKeepOrder<T>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
	const key = String(item);
	if (!seen.has(key)) {
	  seen.add(key);
	  out.push(item);
	}
  }
  return out;
}

/** Slugification façon WordPress (approx. fidèle): minuscules, sans accents, espaces→"-", supprime apostrophes, caractères non [a-z0-9-]. */
export function slugifyWp(input: string): string {
  let s = (input ?? "").toLowerCase();
  // supprime accents
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // supprime apostrophes
  s = s.replace(/'/g, "");
  // unifie tirets (em/en dash) et espaces
  s = s.replace(/[–—]/g, "-");
  s = s.replace(/\s*-\s*/g, "-");
  s = s.replace(/\s+/g, "-");
  // ne garde que a-z, 0-9 et tiret
  s = s.replace(/[^a-z0-9-]/g, "");
  // compresse tirets
  s = s.replace(/-+/g, "-");
  // retire tirets en bord
  s = s.replace(/^-+|-+$/g, "");
  return s;
}

/** "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS". Si date seule, ajoute "T00:00:00". */
export function toIsoWithT(input: string): string {
  const s = (input ?? "").trim();
  if (!s) return s;
  // déjà au format ISO simple
  if (s.includes("T")) return s;
  // date + heure -> remplace 1er espace par T
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
	return s.replace(" ", "T");
  }
  // date seule -> ajoute T00:00:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
	return `${s}T00:00:00`;
  }
  // fallback: remplace le premier espace par T
  return s.replace(" ", "T");
}

/** Trim ou null si vide. */
export function trimOrNull(input?: string): string | null {
  if (input == null) return null;
  const t = input.trim();
  return t.length ? t : null;
}

/** Présence = true (non vide), vide/undefined/null = false. */
export function boolFromPresence(input?: string): boolean {
  return !!(input && input.trim().length);
}

/** Retourne l'URL trimée si elle ressemble à une URL http(s), sinon null. */
export function ensureUrlOrNull(input?: string): string | null {
  const t = (input ?? "").trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return null;
}
