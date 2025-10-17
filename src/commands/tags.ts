// src/commands/tags.ts (v2 + logger conditionnel, modale toujours affichée)
// Commande: Tags → Mettre à jour depuis le dernier CSV (WP → Obsidian)

import type { Plugin, TFile } from "obsidian";
import { Notice } from "obsidian";

import {
  TAGS_CSV_DIR,
  TAGS_CSV_PATTERN,
  findLatestCsv,
  readAndParseCsv,
  type TagRow,
} from "../services/tagsCsv";

import {
  readTagsTable,
  renderTagsTable,
  replaceTableInContent,
  backupTagsTable,
  type LocalTagRow,
} from "../services/tagsTable";

import {
  buildTagsDiff,
  applyTagsDiff,
  hasLocalWithoutIdMissingInCsv,
  type DiffItem,
  type DiffKind,
} from "../services/tagsDiff";

import { openTagsDiffModal } from "../modals/tagsDiffModal";
import { openInfoModal } from "../modals/simpleInfoModal";
import { applyYamlPatch } from "../services/yamlPatch";

// Logger Markdown (utilisé seulement si loggingEnabled=true)
import {
  beginActionLog,
  appendSection as appendLogSection,
  finalizeActionLog,
} from "../services/actionLogger";

// Toggle dans les paramètres
import { isLoggingEnabled } from "../settings";

export function registerTagsCommand(plugin: Plugin): void {
  plugin.addCommand({
	id: "update-tags-from-last-csv",
	name: "Tags → Mettre à jour depuis le dernier CSV (WP → Obsidian)",
	callback: async () => {
	  const { app } = plugin;
	  const actionId = "update-tags-from-last-csv";
	  const logging = isLoggingEnabled(plugin); // ✅ logs activés ?
	  let logPath = "";
	  let startedAt = "";

	  /* 0) Localiser le dernier CSV */
	  const csvFile = findLatestCsv(app.vault);
	  if (!csvFile) {
		new Notice(
		  `Aucun CSV trouvé dans "${TAGS_CSV_DIR}/" (attendu: ${TAGS_CSV_PATTERN.source}).`,
		  7000
		);
		return;
	  }

	  /* 1) Lire + parser le CSV (entêtes strictes) */
	  let csvRows: TagRow[] = [];
	  let csvRaw = "";
	  try {
		const parsed = await readAndParseCsv(app.vault, csvFile);
		if (!parsed.headerValid) {
		  await openInfoModal(
			app,
			"Tags — CSV invalide",
			"L’en-tête du CSV ne correspond pas au format attendu (wp_tags_id,wp_tags_name,wp_tags_slug,wp_tags_count)."
		  );
		  return;
		}
		csvRows = parsed.rows || [];
		csvRaw = await app.vault.read(csvFile);
		if (parsed.errors?.length) {
		  console.warn("[pierregelas-fr] tags v2 CSV warnings:", parsed.errors);
		  new Notice(`CSV parsé avec ${parsed.errors.length} avertissement(s).`, 4000);
		}
	  } catch (err: any) {
		console.error("[pierregelas-fr] readAndParseCsv error:", err);
		await openInfoModal(app, "Tags — Erreur de lecture CSV", String(err?.message ?? err));
		return;
	  }

	  /* 2) Lire la table locale ob_tags_table.md (v2: 5 colonnes) */
	  const tagsDoc = await readTagsTable(app.vault);
	  if (!tagsDoc || !tagsDoc.file) {
		await openInfoModal(
		  app,
		  "Tags — Fichier introuvable",
		  `Le fichier "wp_tags/ob_tags_table.md" est introuvable. Crée-le (5 colonnes: id|name|slug|count|notes) puis relance la commande.`
		);
		return;
	  }
	  const localRows: LocalTagRow[] = tagsDoc.table?.rows || [];

	  /* 2.b) Démarrer le log (seulement si logging ON) */
	  if (logging) {
		const begun = await beginActionLog(app.vault, actionId, {
		  actionVersion: "v2",
		  csvFileName: csvFile.name,
		  csvRows: csvRows.length,
		  tableRowsBefore: localRows.length,
		});
		logPath = begun.logPath;
		startedAt = begun.startedAt;

		// Entrées — CSV brut
		await appendLogSection(
		  app.vault,
		  logPath,
		  "Entrées — CSV (lu)",
		  ["```csv", csvRaw.trim(), "```"].join("\n")
		);

		// Entrées — Table locale (slice exacte)
		const tableSlice =
		  tagsDoc.table && extractTableSlice(tagsDoc.raw, tagsDoc.table.startLine, tagsDoc.table.endLine);
		if (tableSlice) {
		  await appendLogSection(
			app.vault,
			logPath,
			"Entrées — Table locale (brute)",
			["```md", tableSlice.trim(), "```"].join("\n")
		  );
		}
	  }

	  /* 3) Construire la diff (v2 — 7 groupes FR) */
	  const diff = buildTagsDiff(csvRows, localRows);

	  // Diff → Markdown (copie “texte” de la modale) — (seulement si logging ON)
	  if (logging) {
		const diffMd = buildDiffMarkdown(diff.items, diff.counts);
		await appendLogSection(app.vault, logPath, "Diff — Copie texte", diffMd);
	  }

	  /* 4) Ouvrir TOUJOURS la modale (actionnables + info) — sécurisé */
	  let result: { applyKeys: string[] } | null = null;
	  try {
		result = await openTagsDiffModal(app, {
		  items: diff.items,
		  dialogTitle: diff.hasActionable
			? "Mettre à jour la table des tags"
			: "Tags — Revue informative (aucun changement actionnable)",
		  csvName: csvFile.name,
		});
	  } catch (e: any) {
		console.error("[pierregelas-fr] tags v2 modal error:", e);
		if (logging) {
		  await appendLogSection(
			app.vault,
			logPath,
			"Diff — Erreur d’ouverture modale",
			String(e?.message ?? e)
		  );
		}
		// Fallback lisible si jamais la modale plante
		await openInfoModal(
		  app,
		  "Tags — Aperçu des changements",
		  "La modale n’a pas pu s’ouvrir. Un aperçu texte des changements a été écrit dans le log (si activé).\nTu peux quand même appliquer manuellement en relançant après correction."
		);
	  }

	  /* 5) Si aucun changement actionnable → YAML + (log si ON), puis sortie */
	  if (!diff.hasActionable) {
		let backup: TFile | null = null;
		try {
		  const nowStr = toLocalIsoMinute();
		  const yamlUpdates: Record<string, string | boolean> = {
			tags_last_udpdate: nowStr,
			tags_last_csv: `[[${csvFile.name}]]`,
			wp_update: hasLocalWithoutIdMissingInCsv(localRows, csvRows), // bool natif
		  };

		  backup = await backupTagsTable(app.vault, tagsDoc.file);
		  const withYaml = applyYamlPatch(tagsDoc.raw, yamlUpdates);
		  await app.vault.modify(tagsDoc.file, withYaml);

		  if (logging) {
			await finalizeActionLog(app.vault, logPath, startedAt, {
			  status: "success",
			  diffCounts: toCountsForLog(diff.counts),
			  backupPath: backup?.path,
			  wpUpdateAfter: Boolean(yamlUpdates.wp_update),
			  tableRowsAfter: localRows.length,
			  yamlSummary: yamlUpdates,
			});
		  }
		} catch (err: any) {
		  console.error("[pierregelas-fr] tags v2 zero-action yaml update error:", err);
		  if (logging) {
			await finalizeActionLog(app.vault, logPath, startedAt, {
			  status: "error",
			  errorMessage: String(err?.message ?? err),
			  diffCounts: toCountsForLog(diff.counts),
			  tableRowsAfter: localRows.length,
			});
		  }
		  await openInfoModal(app, "Tags — Erreur d’écriture YAML", String(err?.message ?? err));
		}
		return;
	  }

	  /* 6) Items actionnables → traiter la sélection */
	  if (!result) {
		if (logging) {
		  await finalizeActionLog(app.vault, logPath, startedAt, {
			status: "cancel",
			diffCounts: toCountsForLog(diff.counts),
			tableRowsAfter: localRows.length,
		  });
		}
		return;
	  }

	  const selected = new Set(result.applyKeys || []);
	  if (selected.size === 0) {
		new Notice("Aucun changement sélectionné.", 4000);
		if (logging) {
		  await finalizeActionLog(app.vault, logPath, startedAt, {
			status: "cancel",
			diffCounts: toCountsForLog(diff.counts),
			tableRowsAfter: localRows.length,
		  });
		}
		return;
	  }

	  // Log — sélection appliquée (si ON)
	  if (logging) {
		await appendLogSection(
		  app.vault,
		  logPath,
		  "Sorties — Sélection appliquée",
		  `- **applyKeys**: ${JSON.stringify(Array.from(selected))}\n`
		);
	  }

	  /* 7) Appliquer les items sélectionnés (v2) */
	  try {
		const applyItems: DiffItem[] = diff.items.filter((it) => selected.has(it.key));
		const newRows = applyTagsDiff(localRows, applyItems);

		// Générer la table (tri par slug) + YAML
		const newTableMd = renderTagsTable(newRows);
		const nowStr = toLocalIsoMinute();
		const yamlUpdates: Record<string, string | boolean> = {
		  tags_last_udpdate: nowStr,
		  tags_last_csv: `[[${csvFile.name}]]`,
		  wp_update: hasLocalWithoutIdMissingInCsv(newRows, csvRows), // bool natif
		};

		// Backup, patch YAML, remplacer table, écrire
		const backup = await backupTagsTable(app.vault, tagsDoc.file);
		const withYaml = applyYamlPatch(tagsDoc.raw, yamlUpdates);
		const finalContent = replaceTableInContent(withYaml, tagsDoc.table, newTableMd);
		await app.vault.modify(tagsDoc.file, finalContent);

		if (logging) {
		  await finalizeActionLog(app.vault, logPath, startedAt, {
			status: "success",
			diffCounts: toCountsForLog(diff.counts),
			appliedCounts: toAppliedCountsForLog(applyItems),
			backupPath: backup?.path,
			wpUpdateAfter: Boolean(yamlUpdates.wp_update),
			tableRowsAfter: newRows.length,
			finalTableMd: newTableMd,
			yamlSummary: yamlUpdates,
		  });
		}

		new Notice(`Tags mis à jour depuis [[${csvFile.name}]].`, 5000);
	  } catch (err: any) {
		console.error("[pierregelas-fr] update-tags-from-last-csv (v2) error:", err);
		if (logging) {
		  await finalizeActionLog(app.vault, logPath, startedAt, {
			status: "error",
			errorMessage: String(err?.message ?? err),
			diffCounts: toCountsForLog(diff.counts),
			tableRowsAfter: localRows.length,
		  });
		}
		await openInfoModal(app, "Tags — Erreur d’application", String(err?.message ?? err));
	  }
	},
  });
}

/* ============================== Helpers =============================== */

function toLocalIsoMinute(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}-${MM}-${DD} ${hh}:${mm}`;
}

// Extrait la table EXACTE (markdown) depuis le contenu brut en utilisant les indices start/end (corps sans YAML)
function extractTableSlice(raw: string, startLine: number, endLine: number): string | null {
  const { body } = splitYamlLike(raw);
  const lines = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (startLine < 0 || endLine < startLine || endLine >= lines.length) return null;
  return lines.slice(startLine, endLine + 1).join("\n");
}

function splitYamlLike(raw: string): { yaml: string | null; body: string } {
  const text = (raw ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.startsWith("---\n")) return { yaml: null, body: text };
  const idx = text.indexOf("\n---", 4);
  if (idx < 0) return { yaml: null, body: text };
  const yaml = text.slice(4, idx).trimEnd();
  const rest = text.slice(idx + 4);
  const body = rest.startsWith("\n") ? rest.slice(1) : rest;
  return { yaml, body };
}

/* ---------- Diff → Markdown (pour le log) ---------- */

const ORDER: DiffKind[] = [
  "nouveaux tags",
  "id update",
  "name update",
  "count update",
  "tags à créer",
  "tags à modifier",
  "problèmes",
];

function buildDiffMarkdown(items: DiffItem[], counts: Record<DiffKind, number>): string {
  const byKind: Record<DiffKind, DiffItem[]> = {
	"nouveaux tags": [],
	"id update": [],
	"name update": [],
	"count update": [],
	"tags à créer": [],
	"tags à modifier": [],
	"problèmes": [],
  };
  for (const it of items) byKind[it.kind].push(it);

  const out: string[] = [];
  for (const kind of ORDER) {
	const arr = byKind[kind];
	out.push(`### ${labelFor(kind)} (n=${counts[kind] ?? arr.length})`);
	for (const it of arr) out.push("- " + formatItemLine(it));
	out.push("");
  }
  return out.join("\n").trim() + "\n";
}

function labelFor(k: DiffKind): string {
  switch (k) {
	case "nouveaux tags":
	  return "Nouveaux tags";
	case "id update":
	  return "ID update";
	case "name update":
	  return "Name update";
	case "count update":
	  return "Count update";
	case "tags à créer":
	  return "Tags à créer (info seule)";
	case "tags à modifier":
	  return "Tags à modifier (info seule)";
	case "problèmes":
	  return "Problèmes (info seule)";
  }
}

function formatItemLine(it: DiffItem): string {
  const beforeStr = it.before ? formatRow(it.before) : "(absent)";
  const afterStr = it.after ? formatRow(it.after) : "(inchangé)";
  const csvStr = it.csv
	? formatCsvRow({ id: it.csv.id, slug: it.csv.slug, name: it.csv.name, count: it.csv.count })
	: null;

  const isActionable =
	it.kind === "nouveaux tags" ||
	it.kind === "id update" ||
	it.kind === "name update" ||
	it.kind === "count update";

  const label = compactHead(it);
  if (isActionable) {
	return `${label} — Avant: ${beforeStr} → Après: ${afterStr}`;
  } else {
	return csvStr
	  ? `${label} — Local: ${beforeStr}; CSV: ${csvStr}`
	  : `${label} — Local: ${beforeStr}`;
  }
}

function compactHead(it: DiffItem): string {
  const slug = (it.after?.slug ?? it.before?.slug ?? it.csv?.slug ?? "").trim().toLowerCase();
  const id =
	(it.after?.id as number | undefined) ??
	(it.before?.id as number | undefined) ??
	(typeof it.csv?.id === "number" ? (it.csv.id as number) : undefined);
  if (slug && id != null) return `${it.kind}: ${slug} (id=${id})`;
  if (slug) return `${it.kind}: ${slug}`;
  if (id != null) return `${it.kind}: id=${id}`;
  return `${it.kind}`;
}

function formatRow(r: { id?: number; name?: string; slug?: string; count?: number }): string {
  const id = r.id != null ? `id=${r.id}` : "id=∅";
  const slug = r.slug ? `slug=${(r.slug ?? "").trim().toLowerCase()}` : "slug=∅";
  const name = r.name ? `name="${(r.name ?? "").trim()}"` : `name=""`;
  const count =
	typeof r.count === "number" && Number.isFinite(r.count) ? `count=${Math.trunc(r.count)}` : "count=0";
  return `${id}; ${slug}; ${name}; ${count}`;
}

function formatCsvRow(r: { id?: unknown; name?: unknown; slug?: unknown; count?: unknown }): string {
  const id =
	typeof r.id === "number" && Number.isFinite(r.id) ? `id=${Math.trunc(r.id)}` : "id=∅";
  const slug = r.slug ? `slug=${String(r.slug).trim().toLowerCase()}` : "slug=∅";
  const name = r.name ? `name="${String(r.name).trim()}"` : `name=""`;
  const n =
	typeof r.count === "number" && Number.isFinite(r.count) ? `count=${Math.trunc(r.count)}` : "count=0";
  return `${id}; ${slug}; ${name}; ${n}`;
}

/* ---------- Comptages pour le log ---------- */

function toCountsForLog(counts: Record<DiffKind, number>) {
  return {
	nouveaux_tags: counts["nouveaux tags"] ?? 0,
	id_update: counts["id update"] ?? 0,
	name_update: counts["name update"] ?? 0,
	count_update: counts["count update"] ?? 0,
	tags_a_creer: counts["tags à créer"] ?? 0,
	tags_a_modifier: counts["tags à modifier"] ?? 0,
	problemes: counts["problèmes"] ?? 0,
  };
}

function toAppliedCountsForLog(items: DiffItem[]) {
  const acc = {
	nouveaux_tags: 0,
	id_update: 0,
	name_update: 0,
	count_update: 0,
  };
  for (const it of items) {
	if (it.kind === "nouveaux tags") acc.nouveaux_tags++;
	else if (it.kind === "id update") acc.id_update++;
	else if (it.kind === "name update") acc.name_update++;
	else if (it.kind === "count update") acc.count_update++;
  }
  return acc;
}
