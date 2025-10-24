// src/core/yamlHelpers.ts

import type {
  ArchivesYamlInput,
  JournalYamlInput,
  MinutesYamlInput,
  RestesYamlInput,
} from "./yamlMaster";

const READABLE_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function prepareRestesInput(
  imgFilename: string,
  titreCourt: string,
  date: Date
): RestesYamlInput {
  const safeTitreCourt = normalizeTitre(titreCourt);
  const postTitre2 = formatPostTitre2(date);
  const postTitreFull = buildFullTitle(safeTitreCourt, postTitre2);
  const isoDate = formatIsoLocal(date);
  const imageName = replaceImageSuffix(imgFilename, "_REI");

  const input: RestesYamlInput = {
	cover: imageName,
	img_alt: safeTitreCourt ? [safeTitreCourt] : [],
	img_filename: imageName ? [imageName] : [],
	img_legende: postTitreFull ? [postTitreFull] : [],
	lien_projet: ["[[Photo]]", "[[Restes du futur]]"],
	maj_wp: true,
	post_cat: ["photo", "restes-du-futur"],
	post_date: isoDate,
	post_mod: isoDate,
	post_titre_1: safeTitreCourt || null,
	post_titre_2: postTitre2 || null,
	post_titre_full: postTitreFull,
	post_vid_url: "",
	tags: [],
  };

  return input;
}

export function prepareArchivesInput(
  imgFilename: string,
  titreCourt: string,
  date: Date
): ArchivesYamlInput {
  const safeTitreCourt = normalizeTitre(titreCourt);
	const postTitre2 = formatPostTitre2(date);
	const postTitreFull = buildFullTitle(safeTitreCourt, postTitre2);
	const isoDate = formatIsoLocal(date);
	const imageName = replaceImageSuffix(imgFilename, "_BF");

	const input: ArchivesYamlInput = {
	  cover: imageName,
	  img_alt: safeTitreCourt ? [safeTitreCourt] : [],
	  img_filename: imageName ? [imageName] : [],
	  img_legende: postTitreFull ? [postTitreFull] : [],
	  lien_projet: ["[[Photo]]", "[[Archives du futur]]"],
	  maj_wp: true,
	  post_cat: ["photo", "archives-du-futur"],
	  post_date: isoDate,
	  post_mod: isoDate,
	  post_titre_1: safeTitreCourt || null,
	  post_titre_2: postTitre2 || null,
	  post_titre_full: postTitreFull,
	  post_vid_url: "",
	  tags: [],
	};

	return input;
  }

  export interface PrepareJournalParams {
	imageName: string;
	titreCourt: string;
	titreLong: string;
	titreFull: string;
	dateIso: string;
	lienArchives?: string | null;
	lienRestes?: string | null;
	lienJournal?: string | null;
	tags?: string[];
  }

  export function prepareJournalInput(params: PrepareJournalParams): JournalYamlInput {
	const safeTitreCourt = normalizeTitre(params.titreCourt);
	const safeTitreLong = normalizeTitre(params.titreLong);
	const safeTitreFull = normalizeTextBlock(params.titreFull);
	const isoDate = normalizeTitre(params.dateIso);
	const imageName = normalizeTitre(params.imageName);

	const tags = Array.isArray(params.tags)
		  ? params.tags.map((tag) => normalizeTitre(tag)).filter(Boolean)
		  : [];

	const input: JournalYamlInput = {
		  cover: imageName,
		  img_alt: safeTitreCourt ? [safeTitreCourt] : [],
		  img_filename: imageName ? [imageName] : [],
		  img_legende: safeTitreFull ? [safeTitreFull] : [],
		  lien_archives: toNullable(params.lienArchives),
		  lien_journal: toNullable(params.lienJournal),
		  lien_restes: toNullable(params.lienRestes),
		  lien_projet: ["[[Photo]]", "[[Journal Photo]]"],
		  maj_wp: true,
		  post_cat: ["photo", "journal-photo"],
		  post_date: isoDate,
		  post_mod: isoDate,
		  post_titre_1: safeTitreCourt || null,
		  post_titre_2: safeTitreLong || null,
		  post_titre_full: safeTitreFull,
		  post_vid_url: null,
		  tags,
	};

	return input;
  }

  export interface PrepareMinutesParams {
	imageName: string;
	titreCourt: string;
	titreLong: string;
	titreFull: string;
	dateIso: string;
	videoLink: string;
	tags?: string[];
  }

  export function prepareMinutesInput(params: PrepareMinutesParams): MinutesYamlInput {
	const safeTitreCourt = normalizeTitre(params.titreCourt);
	const safeTitreLong = normalizeTitre(params.titreLong);
	const safeTitreFull = normalizeTextBlock(params.titreFull);
	const isoDate = normalizeTitre(params.dateIso);
	const imageName = normalizeTitre(params.imageName);
	const videoLink = normalizeTitre(params.videoLink);

	const tags = Array.isArray(params.tags)
		  ? params.tags.map((tag) => normalizeTitre(tag)).filter(Boolean)
		  : [];

	const input: MinutesYamlInput = {
		  cover: imageName,
		  img_alt: safeTitreCourt ? [safeTitreCourt] : [],
		  img_filename: imageName ? [imageName] : [],
		  img_legende: safeTitreFull ? [safeTitreFull] : [],
		  lien_projet: ["[[Vidéo]]", "[[Minutes]]"],
		  maj_wp: true,
		  post_cat: ["video", "minutes"],
		  post_date: isoDate,
		  post_mod: isoDate,
		  post_titre_1: safeTitreCourt || null,
		  post_titre_2: safeTitreLong || null,
		  post_titre_full: safeTitreFull,
		  post_vid_url: videoLink,
		  tags,
	};

	return input;
  }

  function replaceImageSuffix(name: string, replacement: "_REI" | "_BF"): string {
	if (typeof name !== "string") return "";
	return name.replace(/_WP/g, replacement);
  }

  function formatPostTitre2(date: Date): string {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
	const readable = capitalizeFirst(READABLE_DATE_FORMAT.format(date));
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${readable} à ${hours}h${minutes}.`;
  }

  function formatIsoLocal(date: Date): string {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  function buildFullTitle(titreCourt: string, postTitre2: string): string {
	const left = titreCourt.trim();
	const right = postTitre2.trim();
	if (left && right) return `${left} ${right}`.replace(/\s{2,}/g, " ").trim();
	return left || right;
  }

  function normalizeTitre(titre: string): string {
	return typeof titre === "string" ? titre.trim() : "";
  }

  function capitalizeFirst(value: string): string {
	if (!value) return "";
	return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function toNullable(value: unknown): string | null {
	if (value == null) return null;
	const s = String(value).trim();
	return s.length > 0 ? s : null;
  }

  function normalizeTextBlock(value: unknown): string {
	if (value == null) return "";
	return String(value).replace(/\r\n?/g, "\n").trim();
  }
