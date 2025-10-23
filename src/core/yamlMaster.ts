// src/core/yamlMaster.ts
import type { MasterFields } from "./types";
import { pushYamlBlock } from "../services/yamlBuilder";

export type MasterTemplate = "archives" | "journal" | "minutes" | "restes";
export const YAML_SECTION_LINES = {
  IMAGES: "IMAGES: ______________________________________________________________________",
  LIEN:   "LIEN: ______________________________________________________________________",
  MAJ:    "MAJ: ______________________________________________________________________",
  POST:   "POST: ______________________________________________________________________",
  WP:     "WP: ______________________________________________________________________",
  WP_IMPORT: "WP-IMPORT: ______________________________________________________________________",
} as const;

export interface EmitOptions {
  /** Forcer les guillemets pour chaque élément de `img_id`. */
  quoteNumericIdsInImages?: boolean; // true par défaut
}

/** Convertit une liste en lignes YAML `- item`; `quoted` force les guillemets. */
export function toYamlList(items: string[], quoted: boolean = false): string[] {
  return items.map(v => {
	const s = v ?? "";
	return quoted ? `- "${s.replace(/"/g, '\\"')}"` : `- ${s}`;
  });
}

function emitList(key: string, arr: string[], quoted = false): string[] {
  if (!arr || arr.length === 0) return [`${key}: []`];
  return [`${key}:`, ...toYamlList(arr, quoted)];
}

function emitScalar(key: string, value: string | number | null | boolean): string {
  if (typeof value === "boolean") return `${key}: ${value ? "true" : "false"}`;
  if (typeof value === "number" && Number.isFinite(value)) return `${key}: ${value}`;
  // null ou chaîne vide ⇒ clé présente mais vide
  if (value == null || String(value).length === 0) return `${key}:`;
  return `${key}: ${value}`;
}

/** Émet le YAML maître (ordre & sections garantis). */
export function createEmptyMasterFields(): MasterFields {
  return {
		cover: "",

		img_alt: [],
		img_descr: [],
		img_filename: [],
		img_id: [],
		img_legende: [],
		img_titre: [],
		img_url: [],

		lien_archives: null,
		lien_journal: null,
		lien_projet: [],
		lien_restes: null,

		maj_wp: false,

		post_cat: [],
		post_date: "",
		post_descr: null,
		post_extrait: null,
		post_id: "",
		post_mod: "",
		post_perma: null,
		post_titre_1: null,
		post_titre_2: null,
		post_titre_full: "",
		post_vid_url: null,
		tags: [],

		wp_carnet_link: null,
		wp_carnet_on: false,
		wp_status: null,

		wp_import_dataset_key: null,
		wp_import_dataset_id: null,
  };
}

export function normalizeMasterFields(input: Partial<MasterFields> = {}): MasterFields {
  const base = createEmptyMasterFields();

  base.cover = normalizeString(input.cover);

  base.img_alt = normalizeStringArray(input.img_alt);
  base.img_descr = normalizeStringArray(input.img_descr);
  base.img_filename = normalizeStringArray(input.img_filename);
  base.img_id = normalizeStringArray(input.img_id);
  base.img_legende = normalizeImgLegende(input.img_legende);
  base.img_titre = normalizeStringArray(input.img_titre);
  base.img_url = normalizeStringArray(input.img_url);

  base.lien_archives = normalizeNullableString(input.lien_archives);
  base.lien_journal = normalizeNullableString(input.lien_journal);
  base.lien_projet = normalizeRawList(input.lien_projet);
  base.lien_restes = normalizeNullableString(input.lien_restes);

  base.maj_wp = normalizeBoolean(input.maj_wp);

  base.post_cat = normalizeRawList(input.post_cat);
  base.post_date = normalizeString(input.post_date);
  base.post_descr = normalizeNullableString(input.post_descr);
  base.post_extrait = normalizeNullableString(input.post_extrait);
  base.post_id = normalizeString(input.post_id);
  base.post_mod = normalizeString(input.post_mod);
  base.post_perma = normalizeNullableString(input.post_perma);
  base.post_titre_1 = normalizeNullableString(input.post_titre_1);
  base.post_titre_2 = normalizeNullableString(input.post_titre_2);
  base.post_titre_full = normalizeString(input.post_titre_full);
  base.post_vid_url = normalizeNullableString(input.post_vid_url);
  base.tags = normalizeRawList(input.tags);

  base.wp_carnet_link = normalizeNullableString(input.wp_carnet_link);
  base.wp_carnet_on = normalizeBoolean(input.wp_carnet_on);
  base.wp_status = normalizeNullableString(input.wp_status);

  base.wp_import_dataset_key = normalizeNullableString(input.wp_import_dataset_key);
  base.wp_import_dataset_id = normalizeNumber(input.wp_import_dataset_id);

  return base;
}

export function buildYamlMaster(
  fields: MasterFields,
  _template?: MasterTemplate,
  opts: EmitOptions = {}
): string {
  const normalized = normalizeMasterFields(fields);
  return emitYaml(normalized, opts);
}

export function emitYaml(master: MasterFields, opts: EmitOptions = {}): string {
  const quoteIds = opts.quoteNumericIdsInImages ?? true;
  const out: string[] = [];

  out.push("---");

  // ———————— CHAMPS GÉNÉRAUX / COVER
  out.push(emitScalar("cover", master.cover));

  // ———————— IMAGES (section + listes)
  out.push(YAML_SECTION_LINES.IMAGES);
  out.push(...emitList("img_alt", master.img_alt));
  out.push(...emitList("img_descr", master.img_descr));
  out.push(...emitList("img_filename", master.img_filename));
  out.push(...emitList("img_id", master.img_id, quoteIds)); // ⚠️ quoted
	{
	  const imgLegendeValues = Array.isArray(master.img_legende) ? master.img_legende : [];
	  const imgLegendeBlock = imgLegendeValues.length === 0
		? ""
		: imgLegendeValues.map(v => v ?? "").join("\n\n");
	  pushYamlBlock(out, "img_legende", imgLegendeBlock);
	}
  out.push(...emitList("img_titre", master.img_titre));
  out.push(...emitList("img_url", master.img_url));

  // ———————— LIEN
  out.push(YAML_SECTION_LINES.LIEN);
  out.push(emitScalar("lien_archives", master.lien_archives));
  out.push(emitScalar("lien_journal", master.lien_journal));
  out.push(...emitList("lien_projet", master.lien_projet)); // wikilinks "[[Name]]"
  out.push(emitScalar("lien_restes", master.lien_restes));

  // ———————— MAJ
  out.push(YAML_SECTION_LINES.MAJ);
  out.push(emitScalar("maj_wp", master.maj_wp));

  // ———————— POST
  out.push(YAML_SECTION_LINES.POST);
  out.push(...emitList("post_cat", master.post_cat));
  out.push(emitScalar("post_date", master.post_date));
  out.push(emitScalar("post_descr", master.post_descr));
  out.push(emitScalar("post_extrait", master.post_extrait));
  out.push(emitScalar("post_id", master.post_id));
  out.push(emitScalar("post_mod", master.post_mod));
  out.push(emitScalar("post_perma", master.post_perma));
  out.push(emitScalar("post_titre_1", master.post_titre_1));
	out.push(emitScalar("post_titre_2", master.post_titre_2));
	out.push(emitScalar("post_titre_full", master.post_titre_full));
	out.push(emitScalar("post_vid_url", master.post_vid_url));
	out.push(...emitList("tags", master.tags));

	// ———————— WP
	out.push(YAML_SECTION_LINES.WP);
	out.push(emitScalar("wp_carnet_link", master.wp_carnet_link));
	out.push(emitScalar("wp_carnet_on", master.wp_carnet_on));
	out.push(emitScalar("wp_status", master.wp_status));

	  if (
			master.wp_import_dataset_key != null &&
			String(master.wp_import_dataset_key).length > 0 &&
			master.wp_import_dataset_id != null &&
			Number.isFinite(master.wp_import_dataset_id)
	  ) {
			out.push(YAML_SECTION_LINES.WP_IMPORT);
			out.push(`wp_import_dataset_key: ${master.wp_import_dataset_key}`);
			out.push(`wp_import_dataset_id: ${Number(master.wp_import_dataset_id)}`);
	  }

	out.push("---");
	return out.join("\n");
  }

  function normalizeString(value: unknown): string {
	if (value == null) return "";
	return String(value).trim();
  }

  function normalizeNullableString(value: unknown): string | null {
	if (value == null) return null;
	const str = String(value).trim();
	return str.length > 0 ? str : null;
  }

  function normalizeBoolean(value: unknown, fallback = false): boolean {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value !== 0;
	if (typeof value === "string") {
		  const norm = value.trim().toLowerCase();
		  if (norm === "true" || norm === "yes" || norm === "1") return true;
		  if (norm === "false" || norm === "no" || norm === "0") return false;
		  if (norm.length === 0) return fallback;
	}
	return fallback;
  }

  function normalizeNumber(value: unknown): number | null {
	if (value == null) return null;
	const num = typeof value === "number" ? value : Number(value);
	return Number.isFinite(num) ? num : null;
  }

  function normalizeStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		  return value
			.map((item) => normalizeString(item))
			.filter((item) => item.length > 0);
	}
	const single = normalizeNullableString(value);
	return single ? [single] : [];
  }

  function normalizeRawList(value: unknown): string[] {
	if (Array.isArray(value)) {
		  return value
			.map((item) => (item == null ? "" : String(item).trim()))
			.filter((item) => item.length > 0);
	}
	if (typeof value === "string") {
		  const trimmed = value.trim();
		  if (!trimmed) return [];
		  return [trimmed];
	}
	return [];
  }

  function normalizeImgLegende(value: unknown): string[] {
	if (Array.isArray(value)) {
		  return value
			.map((item) => normalizeMultiline(item))
			.filter((item) => item.length > 0);
	}
	const single = normalizeMultiline(value);
	return single.length > 0 ? single.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean) : [];
  }

  function normalizeMultiline(value: unknown): string {
	if (value == null) return "";
	return String(value).replace(/\r\n?/g, "\n").trim();
  }
