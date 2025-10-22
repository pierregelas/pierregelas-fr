// src/core/yamlMaster.ts
import type { MasterFields } from "./types";

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
  out.push(...emitList("img_legende", master.img_legende));
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
