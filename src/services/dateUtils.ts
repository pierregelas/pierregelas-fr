// src/services/dateUtils.ts
// Implémentation

/**
 * Extrait une date ISO depuis un nom du type:
 * "AAAA-MM-JJ-hh-mm - Titre…"
 * Retour attendu: "AAAA-MM-JJThh:mm:00"
 */
export function extractIsoDateFromFilename(filename: string): string {
  if (typeof filename !== "string") return "";
  const m = filename.trim().match(
	/^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\b/
  );
  if (!m) return "";
  const [, YYYY, MM, DD, hh, mm] = m;
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}:00`;
}

/**
 * Transforme une date ISO "AAAA-MM-JJThh:mm:00"
 * en français: "Samedi 14 juin 2025 à 15h57."
 */
export function formatDateToFrench(isoDate: string): string {
  if (typeof isoDate !== "string") return "";
  const m = isoDate.match(
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!m) return "";

  const [_, y, mo, d, h, mi] = m;
  const year = Number(y);
  const monthIndex = Number(mo) - 1; // 0-11
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);

  const date = new Date(year, monthIndex, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) return "";

  const jours = [
	"Dimanche",
	"Lundi",
	"Mardi",
	"Mercredi",
	"Jeudi",
	"Vendredi",
	"Samedi",
  ];
  const mois = [
	"janvier",
	"février",
	"mars",
	"avril",
	"mai",
	"juin",
	"juillet",
	"août",
	"septembre",
	"octobre",
	"novembre",
	"décembre",
  ];

  const dow = jours[date.getDay()];
  const moisTxt = mois[date.getMonth()];

  // Heures/minutes en français : ex. 6h05, 15h57
  const hh = String(hour).replace(/^0/, "") || "0";
  const mm = String(minute).padStart(2, "0");

  return `${dow} ${day} ${moisTxt} ${year} à ${hh}h${mm}.`;
}

/**
 * Formatte une date ISO "AAAA-MM-JJThh:mm:00" en français SANS l'heure :
 * ex: "samedi 23 novembre 2024."
 * - `lowercaseDay` = true → jour de la semaine en minuscules (exigence Journal)
 */
export function formatDateToFrenchDayOnly(isoDate: string, lowercaseDay = true): string {
  if (typeof isoDate !== "string") return "";
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return "";

  const [_, y, mo, d, h, mi] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0, 0);
  if (Number.isNaN(date.getTime())) return "";

  const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

  let dow = jours[date.getDay()];
  if (!lowercaseDay) dow = dow.charAt(0).toUpperCase() + dow.slice(1);
  const day = date.getDate();
  const month = mois[date.getMonth()];
  const year = date.getFullYear();

  return `${dow} ${day} ${month} ${year}.`;
}
