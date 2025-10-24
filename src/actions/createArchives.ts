// src/actions/createArchives.ts
// Actions Archives du futur : création (P1) et mise à jour (P2) avec YAML maître

import type { App, TFile } from "obsidian";
import { Notice } from "obsidian";
import { load as yamlLoad } from "js-yaml";

import type { MasterFields } from "@core/types";
import {
	buildArchivesYaml,
	buildYamlMaster,
	normalizeMasterFields,
} from "@core/yamlMaster";
import { prepareArchivesInput } from "@core/yamlHelpers";
import {
	isJournalPhotoCategory,
	deriveArchivesTitlesFromLinkText,
	toBfImageNameFromWp,
} from "../services/archivesUtils";
import { createNoteFile } from "../services/fileUtils";
import {
	openArchivesDiffModal,
	type DiffItem,
	type DiffModel,
} from "../modals/archivesDiffModal";
import { buildArchivesLinkTitle } from "../services/journalUtils";
import { openInfoModal } from "../modals/simpleInfoModal";

export async function createArchivesFromJournal(app: App): Promise<void> {
	const file = app.workspace.getActiveFile();
	if (!file) {
		new Notice("Aucun fichier actif.", 5000);
		return;
	}

	const fm = getFrontmatter(app, file);
	if (!fm) {
		new Notice("Aucun frontmatter YAML détecté.", 5000);
		return;
	}
	if (!isJournalPhotoCategory(fm.post_cat)) {
		new Notice("Cette note n'est pas une note Journal Photo !", 6000);
		return;
	}

	const postTitreFullJournal = str(fm.post_titre_full);
	const postDateIso = str(fm.post_date);
	const lienArchivesRaw = str(fm.lien_archives);
	const lienRestes = str(fm.lien_restes);
	const imgFilenameWP = str(fm.img_filename);
	const wpImportDatasetKey = str(fm.wp_import_dataset_key);
	const wpImportDatasetId = num(fm.wp_import_dataset_id);

	if (!postTitreFullJournal || !postDateIso || !lienArchivesRaw) {
		new Notice(
			"Frontmatter incomplet (post_titre_full, post_date, lien_archives nécessaires).",
			6000,
		);
		return;
	}

	const archivesTitle = unwrapWiki(lienArchivesRaw);
	if (!archivesTitle) {
		new Notice("Le champ 'lien_archives' est vide ou mal formé.", 6000);
		return;
	}

	const targetPath = `${archivesTitle}.md`;
	if (app.vault.getAbstractFileByPath(targetPath)) {
		new Notice("La note « Archives du futur » est déjà créée !", 6000);
		return;
	}

	const { postTitre1, postTitre2, postTitreFull } =
		deriveArchivesTitlesFromLinkText(archivesTitle);
	if (!postTitre1) {
		new Notice(
			"Impossible de dériver le titre Archives depuis 'lien_archives'.",
			6000,
		);
		return;
	}

	const postDate = new Date(postDateIso);
	if (Number.isNaN(postDate.getTime())) {
		new Notice("La date du journal est invalide.", 6000);
		return;
	}

	const lienJournal = wrapWiki(postTitreFullJournal);

	const archivesInput = prepareArchivesInput(
		imgFilenameWP,
		postTitre1,
		postDate,
	);
	archivesInput.post_titre_1 = postTitre1 || null;
	archivesInput.post_titre_2 = postTitre2 || null;
	archivesInput.post_titre_full = postTitreFull;
	if (postTitreFull) {
		archivesInput.img_legende = [postTitreFull];
	}
	archivesInput.lien_archives = null;
	archivesInput.lien_journal = lienJournal;
	archivesInput.lien_restes = lienRestes || null;
	archivesInput.wp_import_dataset_key = wpImportDatasetKey || null;
	archivesInput.wp_import_dataset_id = wpImportDatasetId;

	const yaml = buildArchivesYaml(archivesInput);
	const imageName =
		archivesInput.img_filename && archivesInput.img_filename.length > 0
			? archivesInput.img_filename[0]
			: "";
	const body = ["## Photo", `![[${imageName}]]`].join("\n");

	try {
		const created = await createNoteFile(
			app.vault,
			archivesTitle,
			yaml,
			body,
		);
		new Notice(`Note « Archives du futur » créée : ${created.name}`, 4000);
	} catch (err: any) {
		console.error("[pierregelas-fr] createArchives error:", err);
		new Notice(
			`Erreur lors de la création de la note : ${err?.message ?? err}`,
			8000,
		);
	}
}

export async function updateArchivesFromJournal(app: App): Promise<void> {
	const journalFile = app.workspace.getActiveFile();
	if (!journalFile) {
		new Notice("Aucun fichier actif.", 5000);
		return;
	}

	const jFm = getFrontmatter(app, journalFile);
	if (!jFm) {
		new Notice(
			"Aucun frontmatter YAML détecté dans la note Journal.",
			6000,
		);
		return;
	}
	if (!isJournalPhotoCategory(jFm.post_cat)) {
		new Notice("Cette note n'est pas une note Journal Photo !", 6000);
		return;
	}

	const jTitreFullYaml = str(jFm.post_titre_full);
	const jTitreFullFile = basenameNoExt(journalFile.name);
	const jTitreFull = jTitreFullYaml || jTitreFullFile;

	const jDateIso = str(jFm.post_date);
	const jLienArchivesRaw = str(jFm.lien_archives);
	const jLienRestes = str(jFm.lien_restes);
	const jImgFilenameWP = str(jFm.img_filename);
	const jTags = toStringArray(jFm.tags);

	if (!jTitreFull || !jDateIso) {
		new Notice(
			"Frontmatter Journal incomplet (post_titre_full, post_date).",
			6000,
		);
		return;
	}

	const archivesTitleFromLink = unwrapWiki(jLienArchivesRaw || "");
	let archivesFile: TFile | null = archivesTitleFromLink
		? (app.vault.getAbstractFileByPath(
				`${archivesTitleFromLink}.md`,
			) as TFile | null)
		: null;
	if (!archivesFile) {
		archivesFile = findArchivesByPostDate(app, jDateIso);
	}
	if (!archivesFile) {
		new Notice(
			"Note « Archives du futur » introuvable (via lien_archives / post_date).",
			7000,
		);
		return;
	}

	const aFm = getFrontmatter(app, archivesFile);
	if (!aFm) {
		new Notice(
			"Aucun frontmatter YAML détecté dans la note Archives.",
			6000,
		);
		return;
	}

	const aTitreFull = str(aFm.post_titre_full);
	const aTitre1 = str(aFm.post_titre_1);
	const aTitre2 = str(aFm.post_titre_2);
	const aDateIso = str(aFm.post_date);
	const aImgFilename = extractFirstString(aFm.img_filename);
	const aLienJournal = str(aFm.lien_journal);
	const aLienRestes = str(aFm.lien_restes);
	const aTags = toStringArray(aFm.tags);

	const sourceTitleForDerivation = jTitreFull || jTitreFullFile;
	const archivesDesiredLink = unwrapWiki(
		buildArchivesLinkTitle(sourceTitleForDerivation),
	);
	const titleChanged = !eqCaseSensitive(archivesDesiredLink, aTitreFull);

	const noAChanges =
		eqCaseSensitive(aDateIso, jDateIso) && sameStringArray(aTags, jTags);
	if (!titleChanged && noAChanges) {
		await openInfoModal(
			app,
			"Archives du futur",
			"La note « Archives du futur » est parfaitement à jour !",
		);
		return;
	}

	const items: DiffItem[] = [];
	items.push({
		key: "post_date",
		label: "Date du post",
		before: aDateIso,
		after: jDateIso,
		group: "A",
		checked: !eqCaseSensitive(aDateIso, jDateIso),
	});
	items.push({
		key: "tags",
		label: "Tags",
		before: aTags,
		after: jTags,
		group: "A",
		checked: !sameStringArray(aTags, jTags),
	});

	let suggestedRename: string | undefined;
	if (titleChanged) {
		const { postTitre1, postTitre2, postTitreFull } =
			deriveArchivesTitlesFromLinkText(archivesDesiredLink);

		const imgFilenameBF = toBfImageNameFromWp(jImgFilenameWP);
		const cover = imgFilenameBF;
		const lienJournalNew = wrapWiki(jTitreFull);
		const lienRestesNew = jLienRestes;

		suggestedRename = postTitreFull;

		items.push({
			key: "post_titre_1",
			label: "Titre 1 (Archives)",
			before: aTitre1,
			after: postTitre1,
			group: "B",
			checked: !eqCaseSensitive(aTitre1, postTitre1),
		});
		items.push({
			key: "post_titre_2",
			label: "Titre 2 (Archives)",
			before: aTitre2,
			after: postTitre2,
			group: "B",
			checked: !eqCaseSensitive(aTitre2, postTitre2),
		});
		items.push({
			key: "post_titre_full",
			label: "Titre complet (Archives)",
			before: aTitreFull,
			after: postTitreFull,
			group: "B",
			checked: !eqCaseSensitive(aTitreFull, postTitreFull),
		});

		items.push({
			key: "img_filename",
			label: "Image (BF)",
			before: aImgFilename ? [aImgFilename] : [],
			after: imgFilenameBF ? [imgFilenameBF] : [],
			group: "B",
			checked: !eqCaseSensitive(aImgFilename, imgFilenameBF),
		});
		items.push({
			key: "cover",
			label: "Cover",
			before: aImgFilename,
			after: cover,
			group: "B",
			checked: !eqCaseSensitive(aImgFilename, cover),
		});
		items.push({
			key: "img_alt",
			label: "Alt de l’image",
			before: aTitre1 ? [aTitre1] : [],
			after: postTitre1 ? [postTitre1] : [],
			group: "B",
			checked: !eqCaseSensitive(aTitre1, postTitre1),
		});
		items.push({
			key: "img_legende",
			label: "Légende de l’image",
			before: aTitreFull ? [aTitreFull] : [],
			after: postTitreFull ? [postTitreFull] : [],
			group: "B",
			checked: !eqCaseSensitive(aTitreFull, postTitreFull),
		});

		items.push({
			key: "lien_journal",
			label: "Lien vers Journal",
			before: aLienJournal,
			after: lienJournalNew,
			group: "B",
			checked: !eqCaseSensitive(aLienJournal, lienJournalNew),
		});
		items.push({
			key: "lien_restes",
			label: "Lien vers Restes",
			before: aLienRestes,
			after: lienRestesNew,
			group: "B",
			checked: !eqCaseSensitive(aLienRestes, lienRestesNew),
		});
	}

	const model: DiffModel = {
		items,
		suggestedRename,
	};
	const result = await openArchivesDiffModal(app, model);
	if (!result) return;

	if (result.applyKeys.length === 0 && !result.renameTo) {
		new Notice("Aucun changement sélectionné.", 4000);
		return;
	}

	try {
		const { master: currentMaster, body } = await readMasterAndBody(
			app,
			archivesFile,
		);
		const nextMaster: MasterFields = { ...currentMaster };

		for (const key of result.applyKeys) {
			const item = items.find((it) => it.key === key);
			if (!item) continue;
			applyMasterUpdate(nextMaster, key, item.after);
		}

		const yaml = buildYamlMaster(nextMaster, "archives");
		const content = assembleDocument(yaml, body);
		await app.vault.modify(archivesFile, content);

		if (result.renameTo) {
			const targetName = result.renameTo.trim();
			if (
				targetName &&
				!eqCaseSensitive(targetName, basenameNoExt(archivesFile.name))
			) {
				await app.vault.rename(archivesFile, `${targetName}.md`);
			}
		}

		new Notice("Note « Archives du futur » mise à jour.", 4000);
	} catch (err: any) {
		console.error("[pierregelas-fr] Archives update error:", err);
		new Notice(
			`Erreur lors de la mise à jour : ${err?.message ?? err}`,
			8000,
		);
	}
