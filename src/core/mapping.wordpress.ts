// src/core/mapping.wordpress.ts
import type { MasterFields, WpRow } from "./types";
import {
  splitMulti,
  splitHierarchy,
  dedupeKeepOrder,
  slugifyWp,
  toIsoWithT,
  trimOrNull,
  boolFromPresence,
  ensureUrlOrNull,
} from "./transform";

/** Liste complète des clés YAML maître (aide au typage) */
type YamlKey = keyof MasterFields;

/** Règle unitaire appliquée à partir d'une ligne CSV WordPress. */
export interface MappingRule<K extends YamlKey = YamlKey> {
  source?: keyof WpRow;
  derive?: (row: WpRow) => MasterFields[K];
  updatePolicy?: "overwrite";
}

/** Déclaration des règles par champ YAML maître. */
export const WP_IMPORT_RULES: { [K in YamlKey]: MappingRule<K> } = {
  // ———————— CHAMPS GÉNÉRAUX
  cover: {
	derive: (row) => {
	  const urls = splitMulti(row.wp_img_url, "||");
	  return urls.length ? urls[0].trim() : null;
	},
	updatePolicy: "overwrite",
  },

  // ———————— IMAGES
  img_alt:      { derive: (r) => dedupeKeepOrder(splitMulti(r.wp_img_alt, "||")), updatePolicy: "overwrite" },
  img_descr:    { derive: (r) => dedupeKeepOrder(splitMulti(r.wp_img_descr, "||")), updatePolicy: "overwrite" },
  img_filename: { derive: (r) => dedupeKeepOrder(splitMulti(r.wp_img_filename, "||")), updatePolicy: "overwrite" },
  img_id:       { derive: (r) => dedupeKeepOrder(splitMulti(r.wp_img_id, "||")), updatePolicy: "overwrite" },
  img_legende:  { derive: (r) => dedupeKeepOrder(splitMulti(r.wp_img_caption, "||")), updatePolicy: "overwrite" },
  img_titre:    { derive: (r) => dedupeKeepOrder(splitMulti(r.wp_img_titre, "||")), updatePolicy: "overwrite" },
  img_url:      { derive: (r) => dedupeKeepOrder(splitMulti(r.wp_img_url, "||")), updatePolicy: "overwrite" },

  // ———————— LIEN
  lien_archives: { derive: () => null, updatePolicy: "overwrite" },
  lien_journal:  { derive: () => null, updatePolicy: "overwrite" },
  lien_projet: {
	  derive: (row) => {
				const names = splitHierarchy(row.wp_categories);
				return names.map((n) => `[[${n}]]`);
			  },
	updatePolicy: "overwrite",
  },
  lien_restes: { derive: () => null, updatePolicy: "overwrite" },

  // ———————— MAJ
  /** ✅ Désormais toujours false (les infos viennent de WP, pas de renvoi vers WP). */
  maj_wp: { derive: () => false, updatePolicy: "overwrite" },

  // ———————— POST
  post_cat:      { derive: (r) => splitHierarchy(r.wp_categories), updatePolicy: "overwrite" },
  post_date:     { derive: (r) => toIsoWithT(r.wp_date), updatePolicy: "overwrite" },
  post_descr:    { derive: (r) => trimOrNull(r.wp_a_descr_gen), updatePolicy: "overwrite" },
  post_extrait:  { derive: (r) => trimOrNull(r.wp_extrait), updatePolicy: "overwrite" },
  post_id:       { derive: (r) => String(r.wp_id ?? ""), updatePolicy: "overwrite" },
  post_mod:      { derive: (r) => toIsoWithT(r.wp_date_modified ?? r.wp_date), updatePolicy: "overwrite" },
  post_perma:    { derive: (r) => ensureUrlOrNull(r.wp_perma), updatePolicy: "overwrite" },
  post_titre_1:  {
	derive: (r) => {
	  const st = (r as any).wp_a_titre_gen?.trim?.();
	  if (st) return st;
	  const full = r.wp_titre ?? "";
	  const m = full.split(/—|–|:/);
	  return m.length > 1 ? m[0].trim() : null;
	},
	updatePolicy: "overwrite",
  },
  post_titre_2:  {
	derive: (r) => {
	  const sst = (r as any).wp_a_stitre_gen?.trim?.();
	  if (sst) return sst;
	  const full = r.wp_titre ?? "";
	  const m = full.split(/—|–|:/);
	  return m.length > 1 ? m.slice(1).join("—").trim() : null;
	},
	updatePolicy: "overwrite",
  },
  post_titre_full: { derive: (r) => r.wp_titre ?? "", updatePolicy: "overwrite" },
  post_vid_url:    { derive: (r) => ensureUrlOrNull(r.wp_a_videolink_gen), updatePolicy: "overwrite" },
  tags:            {
	derive: (r) => {
	  const raw = (r.wp_tags ?? "").split(",").map(s => s.trim()).filter(Boolean);
	  const slugs = raw.map(slugifyWp).filter(Boolean);
	  return dedupeKeepOrder(slugs);
	},
	updatePolicy: "overwrite",
  },

  // ———————— WP
  wp_carnet_link: { derive: (r) => trimOrNull(r.wp_carnet_link), updatePolicy: "overwrite" },
  wp_carnet_on:   { derive: (r) => boolFromPresence(r.wp_carnet_on), updatePolicy: "overwrite" },
  wp_status:      { derive: (r) => trimOrNull(r.wp_status), updatePolicy: "overwrite" },
};

/** Applique toutes les règles de mapping pour générer un `MasterFields` complet. */
export function mapWpRowToMaster(row: WpRow): MasterFields {
  return {
	cover: WP_IMPORT_RULES.cover.derive!(row),

	img_alt:      WP_IMPORT_RULES.img_alt.derive!(row),
	img_descr:    WP_IMPORT_RULES.img_descr.derive!(row),
	img_filename: WP_IMPORT_RULES.img_filename.derive!(row),
	img_id:       WP_IMPORT_RULES.img_id.derive!(row),
	img_legende:  WP_IMPORT_RULES.img_legende.derive!(row),
	img_titre:    WP_IMPORT_RULES.img_titre.derive!(row),
	img_url:      WP_IMPORT_RULES.img_url.derive!(row),

	lien_archives: WP_IMPORT_RULES.lien_archives.derive!(row),
	lien_journal:  WP_IMPORT_RULES.lien_journal.derive!(row),
	lien_projet:   WP_IMPORT_RULES.lien_projet.derive!(row),
	lien_restes:   WP_IMPORT_RULES.lien_restes.derive!(row),

	maj_wp: WP_IMPORT_RULES.maj_wp.derive!(row),

	post_cat:       WP_IMPORT_RULES.post_cat.derive!(row),
	post_date:      WP_IMPORT_RULES.post_date.derive!(row),
	post_descr:     WP_IMPORT_RULES.post_descr.derive!(row),
	post_extrait:   WP_IMPORT_RULES.post_extrait.derive!(row),
	post_id:        WP_IMPORT_RULES.post_id.derive!(row),
	post_mod:       WP_IMPORT_RULES.post_mod.derive!(row),
	post_perma:     WP_IMPORT_RULES.post_perma.derive!(row),
	post_titre_1:   WP_IMPORT_RULES.post_titre_1.derive!(row),
	post_titre_2:   WP_IMPORT_RULES.post_titre_2.derive!(row),
	post_titre_full:WP_IMPORT_RULES.post_titre_full.derive!(row),
	post_vid_url:   WP_IMPORT_RULES.post_vid_url.derive!(row),
	tags:           WP_IMPORT_RULES.tags.derive!(row),

	wp_carnet_link: WP_IMPORT_RULES.wp_carnet_link.derive!(row),
	wp_carnet_on:   WP_IMPORT_RULES.wp_carnet_on.derive!(row),
	wp_status:      WP_IMPORT_RULES.wp_status.derive!(row),
  };
}
