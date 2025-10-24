// src/core/yamlHelpers.ts

import type { ArchivesYamlInput, RestesYamlInput } from "./yamlMaster";

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
