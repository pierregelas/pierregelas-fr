// src/services/yamlBuilder.ts
// Implémentation — construit un bloc YAML COMPLET pour l'action Minutes
// - TOUTES les clés sont présentes (même vides)
// - Ordre strictement fixe
// - Séparateurs visuels sous forme de CLÉS YAML (pas de commentaires)
// - Valeurs auto-remplies : cover, img_* (selon titres fournis), lien_projet, maj_wp, post_cat

export interface MinutesYamlInput {
  /** ex: "20250614_danseetm_mvign.webp" */
  imgFilename: string;
  /** post_titre_1 */
  postTitre1: string;
  /** ex: "Samedi 14 juin 2025 à 15h57." */
  postTitre2: string;
  /** post_titre_1 + " " + post_titre_2 */
  postTitreFull: string;
  /** ISO ex: "2025-06-14T15:57:00" */
  postDate: string;
  /** URL https de la vidéo */
  postVidUrl: string;
}

function q(s: string): string {
  if (!s) return "";
  return `"${s.replace(/"/g, '\\"')}"`;
}

function pushYamlBlock(lines: string[], key: string, value: string | null | undefined): void {
  const normalised = (value ?? "").replace(/\r\n?/g, "\n");
  lines.push(`${key}: |`);
  if (normalised.length === 0) {
	lines.push("  ");
	return;
  }
  const blockLines = normalised.split("\n");
  for (const line of blockLines) {
		lines.push(`  ${line}`);
  }
}

export function buildMinutesYaml(input: MinutesYamlInput): string {
  const imgFilename = input.imgFilename ?? "";
  const postTitre1 = input.postTitre1 ?? "";
  const postTitre2 = input.postTitre2 ?? "";
  const postTitreFull = input.postTitreFull ?? "";
  const postDate = input.postDate ?? "";
  const postVidUrl = input.postVidUrl ?? "";

  // Champs auto (conformes au doc Minutes)
  const cover = imgFilename;         // ok
  const img_alt = postTitre1;        // ok
  const img_descr = "";              // vide
  const img_id = "";                 // vide
  const img_legende = postTitreFull; // ok
  const img_titre = "";              // ⚠️ vide (exigence)
  const img_url = "";                // vide

  // Listes constantes
  const lien_projet = [`[[Vidéo]]`, `[[Minutes]]`];
  const post_cat = ["video", "minutes"];

  const lines: string[] = [];

  lines.push("---");

  // Couverture
  lines.push(`cover: ${cover ? q(cover) : ""}`);

  // ===== IMAGES (séparateur clé YAML visible) =====
  lines.push(`IMAGES: ______________________________________________________________________`);
  lines.push(`img_alt: ${img_alt ? q(img_alt) : ""}`);
  lines.push(`img_descr: ${img_descr ? q(img_descr) : ""}`);
  lines.push(`img_filename: ${imgFilename ? q(imgFilename) : ""}`);
  lines.push(`img_id: ${img_id ? q(img_id) : ""}`);
  pushYamlBlock(lines, "img_legende", img_legende);
  lines.push(`img_titre: ${img_titre ? q(img_titre) : ""}`);
  lines.push(`img_url: ${img_url ? q(img_url) : ""}`);

  // ===== LIEN =====
  lines.push(`LIEN: ______________________________________________________________________`);
  lines.push(`lien_archives:`);
  lines.push(`lien_journal:`);
  lines.push(`lien_projet:`);
  for (const it of lien_projet) {
	lines.push(`  - ${q(it)}`);
  }
  lines.push(`lien_restes:`);

  // ===== MAJ =====
  lines.push(`MAJ: ______________________________________________________________________`);
  lines.push(`maj_wp: true`);

  // ===== POST =====
  lines.push(`POST: ______________________________________________________________________`);
  lines.push(`post_cat:`);
  for (const c of post_cat) {
	lines.push(`  - ${c}`);
  }
  lines.push(`post_date: ${postDate ? q(postDate) : ""}`);
  lines.push(`post_descr:`);
  lines.push(`post_extrait:`);
  lines.push(`post_id:`);
  lines.push(`post_mod:`);
  lines.push(`post_perma:`);
  lines.push(`post_titre_1: ${postTitre1 ? q(postTitre1) : ""}`);
  lines.push(`post_titre_2: ${postTitre2 ? q(postTitre2) : ""}`);
  lines.push(`post_titre_full: ${postTitreFull ? q(postTitreFull) : ""}`);
  lines.push(`post_vid_url: ${postVidUrl ? q(postVidUrl) : ""}`);
  lines.push(`tags:`);
  // (tags vide : liste non initialisée)

  // ===== WP =====
  lines.push(`WP: ______________________________________________________________________`);
  lines.push(`wp_carnet_link:`);
  lines.push(`wp_carnet_on:`);
  lines.push(`wp_status:`);

  lines.push("---");

  return lines.join("\n") + "\n";
}

// ============================= JOURNAL =============================

export interface JournalYamlInput {
  /** ex: "2024-01-26_16_28_3109684_WP.webp" */
  imgFilename: string;
  /** post_titre_1 */
  postTitre1: string;
  /** ex: "Journal du dimanche 26 janvier 2024." */
  postTitre2: string;
  /** post_titre_1 + " " + post_titre_2 */
  postTitreFull: string;
  /** ISO ex: "2024-01-26T16:28:00" */
  postDate: string;
  /** lien_archives (wiki) */
  lienArchives: string;
  /** lien_restes (wiki) */
  lienRestes: string;
}

export function buildJournalYaml(input: JournalYamlInput): string {
  const imgFilename = input.imgFilename ?? "";
  const postTitre1 = input.postTitre1 ?? "";
  const postTitre2 = input.postTitre2 ?? "";
  const postTitreFull = input.postTitreFull ?? "";
  const postDate = input.postDate ?? "";
  const lienArchives = input.lienArchives ?? "";
  const lienRestes = input.lienRestes ?? "";

	// Champs auto (conformes au doc Journal)
	const cover = imgFilename;         // copie du nom d'image
	const img_alt = postTitre1;        // alt = titre 1
	const img_descr = "";              // vide
	const img_id = "";                 // vide
	const img_legende = postTitreFull; // légende = titre complet
	const img_titre = "";              // vide
	const img_url = "";                // vide
	
	// Listes constantes (Journal) :contentReference[oaicite:1]{index=1}
	const lien_projet = [`[[Photo]]`, `[[Journal Photo]]`];
	const post_cat = ["photo", "journal-photo"];
	
	const lines: string[] = [];
	lines.push("---");
	
	// Couverture
	lines.push(`cover: ${cover ? q(cover) : ""}`);
	
	// ===== IMAGES =====
	lines.push(`IMAGES: ______________________________________________________________________`);
	lines.push(`img_alt: ${img_alt ? q(img_alt) : ""}`);
	lines.push(`img_descr: ${img_descr ? q(img_descr) : ""}`);
	lines.push(`img_filename: ${imgFilename ? q(imgFilename) : ""}`);
	lines.push(`img_id: ${img_id ? q(img_id) : ""}`);
	pushYamlBlock(lines, "img_legende", img_legende);
	lines.push(`img_titre: ${img_titre ? q(img_titre) : ""}`);
	lines.push(`img_url: ${img_url ? q(img_url) : ""}`);
	
	// ===== LIEN =====
	lines.push(`LIEN: ______________________________________________________________________`);
	lines.push(`lien_archives: ${lienArchives ? q(lienArchives) : ""}`);
	lines.push(`lien_journal:`);
	lines.push(`lien_projet:`);
	for (const it of lien_projet) lines.push(`  - ${q(it)}`);
	lines.push(`lien_restes: ${lienRestes ? q(lienRestes) : ""}`);
	
	// ===== MAJ =====
	lines.push(`MAJ: ______________________________________________________________________`);
	lines.push(`maj_wp: true`);
	
	// ===== POST =====
	lines.push(`POST: ______________________________________________________________________`);
	lines.push(`post_cat:`);
	for (const c of post_cat) lines.push(`  - ${c}`);
	lines.push(`post_date: ${postDate ? q(postDate) : ""}`);
	lines.push(`post_descr:`);
	lines.push(`post_extrait:`);
	lines.push(`post_id:`);
	lines.push(`post_mod:`);
	lines.push(`post_perma:`);
  lines.push(`post_titre_1: ${postTitre1 ? q(postTitre1) : ""}`);
  lines.push(`post_titre_2: ${postTitre2 ? q(postTitre2) : ""}`);
  lines.push(`post_titre_full: ${postTitreFull ? q(postTitreFull) : ""}`);
  lines.push(`post_vid_url:`); // vide pour Journal :contentReference[oaicite:2]{index=2}
  lines.push(`tags:`);

  // ===== WP =====
  lines.push(`WP: ______________________________________________________________________`);
  lines.push(`wp_carnet_link:`);
  lines.push(`wp_carnet_on:`);
  lines.push(`wp_status:`);

  lines.push("---");
  return lines.join("\n") + "\n";
}

// ============================= ARCHIVES DU FUTUR (P1) =============================

export interface ArchivesYamlInput {
  /** ex: "2024-11-23-17-05_4075037_BF.webp" (image dérivée du _WP → _BF) */
  imgFilenameBF: string;
  /** Titres de la note Archives (dérivés du lien_archives) */
  postTitre1: string;         // partie AVANT "Archives", avec ponctuation finale si besoin
  postTitre2: string;         // "Archives du … ?"
  postTitreFull: string;      // titre complet (texte du lien)
  /** post_date ISO copié depuis la note Journal */
  postDate: string;           // "YYYY-MM-DDThh:mm:00"
  /** Liens */
  lienJournal: string;        // [[Titre complet de la note Journal source]]
  lienRestes: string;         // copié depuis la note Journal source
}

export function buildArchivesYaml(input: ArchivesYamlInput): string {
  const imgFilename = input.imgFilenameBF ?? "";
  const postTitre1 = input.postTitre1 ?? "";
  const postTitre2 = input.postTitre2 ?? "";
  const postTitreFull = input.postTitreFull ?? "";
  const postDate = input.postDate ?? "";
  const lienJournal = input.lienJournal ?? "";
  const lienRestes = input.lienRestes ?? "";

	// Champs auto (conformes au doc Archives P1)
	const cover = imgFilename;            // même image
	const img_alt = postTitre1;           // ✅ alt = post_titre_1 de la note Archives
	const img_descr = "";                 // vide
	const img_id = "";                    // vide
	const img_legende = postTitreFull;    // légende = titre complet
	const img_titre = "";                 // vide
	const img_url = "";                   // vide
	
	// Listes constantes
	const lien_projet = [`[[Photo]]`, `[[Archives du futur]]`];
	const post_cat = ["photo", "archives-du-futur"];
	
	const lines: string[] = [];
	lines.push("---");
	
	// Couverture
	lines.push(`cover: ${cover ? q(cover) : ""}`);
	
	// ===== IMAGES =====
	lines.push(`IMAGES: ______________________________________________________________________`);
	lines.push(`img_alt: ${img_alt ? q(img_alt) : ""}`);
	lines.push(`img_descr: ${img_descr ? q(img_descr) : ""}`);
	lines.push(`img_filename: ${imgFilename ? q(imgFilename) : ""}`);
	lines.push(`img_id: ${img_id ? q(img_id) : ""}`);
	pushYamlBlock(lines, "img_legende", img_legende);
	lines.push(`img_titre: ${img_titre ? q(img_titre) : ""}`);
	lines.push(`img_url: ${img_url ? q(img_url) : ""}`);
	
	// ===== LIEN =====
	lines.push(`LIEN: ______________________________________________________________________`);
	lines.push(`lien_archives:`); // vide (on est déjà dans Archives)
	lines.push(`lien_journal: ${lienJournal ? q(lienJournal) : ""}`);
	lines.push(`lien_projet:`);
	for (const it of lien_projet) lines.push(`  - ${q(it)}`);
	lines.push(`lien_restes: ${lienRestes ? q(lienRestes) : ""}`);
	
	// ===== MAJ =====
	lines.push(`MAJ: ______________________________________________________________________`);
	lines.push(`maj_wp: true`);
	
	// ===== POST =====
	lines.push(`POST: ______________________________________________________________________`);
	lines.push(`post_cat:`);
	for (const c of post_cat) lines.push(`  - ${c}`);
	lines.push(`post_date: ${postDate ? q(postDate) : ""}`);
	lines.push(`post_descr:`);
	lines.push(`post_extrait:`);
	lines.push(`post_id:`);
	lines.push(`post_mod:`);
	lines.push(`post_perma:`);
  lines.push(`post_titre_1: ${postTitre1 ? q(postTitre1) : ""}`);
  lines.push(`post_titre_2: ${postTitre2 ? q(postTitre2) : ""}`);
  lines.push(`post_titre_full: ${postTitreFull ? q(postTitreFull) : ""}`);
  lines.push(`post_vid_url:`); // vide
  lines.push(`tags:`);

  // ===== WP =====
  lines.push(`WP: ______________________________________________________________________`);
  lines.push(`wp_carnet_link:`);
  lines.push(`wp_carnet_on:`);
  lines.push(`wp_status:`);

  lines.push("---");
  return lines.join("\n") + "\n";
}

// ============================= RESTES DU FUTUR (P1) =============================

export interface RestesYamlInput {
  /** ex: "2024-11-23-17-05_4075037_BF.webp" (image dérivée du _WP → _BF) */
  imgFilenameBF: string;
  /** Titres de la note Restes (dérivés du lien_restes) */
  postTitre1: string;         // partie AVANT "Restes", avec ponctuation finale si besoin
  postTitre2: string;         // "Restes du … ?"
  postTitreFull: string;      // titre complet (texte du lien)
  /** post_date ISO copié depuis la note Journal */
  postDate: string;           // "YYYY-MM-DDThh:mm:00"
  /** Liens */
  lienJournal: string;        // [[Titre complet de la note Journal source]]
  lienArchives: string;       // copié depuis la note Journal source
}

export function buildRestesYaml(input: RestesYamlInput): string {
  const imgFilename = input.imgFilenameBF ?? "";
  const postTitre1 = input.postTitre1 ?? "";
  const postTitre2 = input.postTitre2 ?? "";
  const postTitreFull = input.postTitreFull ?? "";
  const postDate = input.postDate ?? "";
  const lienJournal = input.lienJournal ?? "";
  const lienArchives = input.lienArchives ?? "";

// Champs auto (conformes au modèle Restes P1)
  const cover = imgFilename;            // même image
  const img_alt = postTitre1;           // alt = post_titre_1 de la note Restes
  const img_descr = "";                 // vide
  const img_id = "";                    // vide
  const img_legende = postTitreFull;    // légende = titre complet
  const img_titre = "";                 // vide
  const img_url = "";                   // vide

  // Listes constantes
  const lien_projet = [`[[Photo]]`, `[[Restes du futur]]`];
  const post_cat = ["photo", "restes-du-futur"];

  const lines: string[] = [];
  lines.push("---");

  // Couverture
  lines.push(`cover: ${cover ? q(cover) : ""}`);

  // ===== IMAGES =====
  lines.push(`IMAGES: ______________________________________________________________________`);
  lines.push(`img_alt: ${img_alt ? q(img_alt) : ""}`);
  lines.push(`img_descr: ${img_descr ? q(img_descr) : ""}`);
  lines.push(`img_filename: ${imgFilename ? q(imgFilename) : ""}`);
  lines.push(`img_id: ${img_id ? q(img_id) : ""}`);
  pushYamlBlock(lines, "img_legende", img_legende);
  lines.push(`img_titre: ${img_titre ? q(img_titre) : ""}`);
  lines.push(`img_url: ${img_url ? q(img_url) : ""}`);

  // ===== LIEN =====
  lines.push(`LIEN: ______________________________________________________________________`);
  lines.push(`lien_archives: ${lienArchives ? q(lienArchives) : ""}`);
  lines.push(`lien_journal: ${lienJournal ? q(lienJournal) : ""}`);
  lines.push(`lien_projet:`);
  for (const it of lien_projet) lines.push(`  - ${q(it)}`);
  lines.push(`lien_restes:`); // vide (on est déjà dans Restes)

  // ===== MAJ =====
  lines.push(`MAJ: ______________________________________________________________________`);
  lines.push(`maj_wp: true`);

  // ===== POST =====
  lines.push(`POST: ______________________________________________________________________`);
  lines.push(`post_cat:`);
  for (const c of post_cat) lines.push(`  - ${c}`);
  lines.push(`post_date: ${postDate ? q(postDate) : ""}`);
  lines.push(`post_descr:`);
  lines.push(`post_extrait:`);
  lines.push(`post_id:`);
  lines.push(`post_mod:`);
  lines.push(`post_perma:`);
  lines.push(`post_titre_1: ${postTitre1 ? q(postTitre1) : ""}`);
  lines.push(`post_titre_2: ${postTitre2 ? q(postTitre2) : ""}`);
  lines.push(`post_titre_full: ${postTitreFull ? q(postTitreFull) : ""}`);
  lines.push(`post_vid_url:`); // vide
  lines.push(`tags:`);

  // ===== WP =====
  lines.push(`WP: ______________________________________________________________________`);
  lines.push(`wp_carnet_link:`);
  lines.push(`wp_carnet_on:`);
  lines.push(`wp_status:`);

  lines.push("---");
  return lines.join("\n") + "\n";
}
