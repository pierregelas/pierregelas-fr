// src/core/types.ts

export type IsoString = string; // "YYYY-MM-DDTHH:MM:SS"

export interface WpRow {
  wp_id: string;
  wp_titre: string;
  wp_date: string;
  wp_date_modified?: string;
  wp_perma?: string;
  wp_status?: string;
  wp_tags?: string;            // séparateur: ","
  wp_categories?: string;      // hiérarchie: "A>B>C"
  wp_a_descr_gen?: string;
  wp_extrait?: string;
  wp_a_videolink_gen?: string;

  // Images (multi via "||")
  wp_img_url?: string;
  wp_img_id?: string;
  wp_img_titre?: string;
  wp_img_caption?: string;
  wp_img_descr?: string;
  wp_img_alt?: string;
  wp_img_filename?: string;

  wp_carnet_on?: string;
  wp_carnet_link?: string;
}

export interface MasterFields {
  cover: string | null;

  // IMAGES
  img_alt: string[];
  img_descr: string[];
  img_filename: string[];
  img_id: string[];            // ⚠️ émettre avec guillemets en YAML
  img_legende: string[];
  img_titre: string[];
  img_url: string[];

  // LIEN
  lien_archives: string | null;
  lien_journal: string | null;
  lien_projet: string[];       // ex.: '[[Vidéo]]'
  lien_restes: string | null;

  // MAJ
  maj_wp: boolean;

  // POST
  post_cat: string[];          // names (non-slugs), hiérarchie aplatie
  post_date: IsoString;
  post_descr: string | null;
  post_extrait: string | null;
  post_id: string;
  post_mod: IsoString;
  post_perma: string | null;
  post_titre_1: string | null;
  post_titre_2: string | null;
  post_titre_full: string;
  post_vid_url: string | null;
  tags: string[];              // slugifiés façon WordPress

  // WP
  wp_carnet_link: string | null;
  wp_carnet_on: boolean;
  wp_status: string | null;
}

export type MappingStatus = "created" | "updated" | "error";

export interface ImportLineLog {
  index: number;               // index de la ligne CSV (0-based)
  status: MappingStatus;
  message?: string;
  path?: string;               // chemin de la note écrite/mise à jour
  post_id?: string;
}

export interface ImportSummary {
  created: number;
  updated: number;
  errors: number;
  lines: ImportLineLog[];
}
