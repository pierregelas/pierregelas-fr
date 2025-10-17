// src/core/files.ts

/**
 * Construit un nom de fichier à partir d'un titre en gardant :
 *  - accents, espaces, `?` et `!`
 *  - remplace uniquement les caractères illégaux `/ \ : * " < > |` par `-`
 *  - compresse les `-` consécutifs, trim débuts/fins, retire points/espaces finaux
 *  - tronque prudemment si trop long
 *  - ajoute l'extension `.md` si absente
 */
export function sanitizeForFilename(title: string): string {
  const MAX_LEN = 180; // marge de sécurité cross-plateformes
  let base = String(title ?? "").trim();

  // Remplacement ciblé (on GARDE ? et !)
  base = base.replace(/[\/:\\*"<>|]/g, "-");

  // Normalisations légères
  base = base.replace(/-+/g, "-");               // compresse tirets
  base = base.replace(/\s+-\s+/g, "-");          // " - " -> "-"
  base = base.replace(/[ \t]+/g, " ").trim();    // espaces multiples -> simple

  // Evite noms vides
  if (!base.length) base = "Sans titre";

  // Retire points/espaces finaux (certains FS n'aiment pas)
  base = base.replace(/[.\s]+$/g, "");

  // Tronque si trop long (en gardant l'extension future)
  if (base.length > MAX_LEN) base = base.slice(0, MAX_LEN).trim();

  // Ajoute .md si absent
  if (!/\.md$/i.test(base)) base = `${base}.md`;

  return base;
}

/**
 * Retourne un chemin unique pour `dir/filename`.
 * - Si le chemin existe déjà, suffixe " (2)", " (3)", ...
 * - Par défaut, si `exists` n'est pas fourni, on renvoie `dir/filename` sans vérif (à surcharger côté action).
 *
 * @param dir Chemin absolu du dossier de sortie (ex.: "/NEW")
 * @param filename Nom de fichier (déjà "sanitizé", idéalement avec `.md`)
 * @param exists Fonction asynchrone testant l'existence d'un chemin absolu (ex.: app.vault.adapter.exists)
 */
export async function ensureUniquePath(
  dir: string,
  filename: string,
  exists?: (absPath: string) => Promise<boolean>
): Promise<string> {
  const join = (a: string, b: string) =>
	a.replace(/[\/\\]+$/,"") + "/" + b.replace(/^[\/\\]+/,"");

  const makeCandidate = (n: number) => {
	if (n === 1) return filename;
	const m = filename.match(/^(.*?)(\.[^.]+)$/); // garde extension
	if (!m) return `${filename} (${n})`;
	const [, name, ext] = m;
	return `${name} (${n})${ext}`;
  };

  // Sans fonction d'existence, on ne peut pas vérifier → fallback passif
  if (!exists) return join(dir, filename);

  let n = 1;
  while (true) {
	const candidate = makeCandidate(n);
	const abs = join(dir, candidate);
	const taken = await exists(abs);
	if (!taken) return abs;
	n++;
	// garde-fou
	if (n > 9999) throw new Error("ensureUniquePath: too many collisions");
  }
}
