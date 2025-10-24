// src/actions/createJournal.ts
// Action: création d'une note Journal avec YAML maître unifié

import type { App } from "obsidian";
import { Modal, Notice, Setting } from "obsidian";

import { buildJournalYaml } from "@core/yamlMaster";
import { prepareJournalInput } from "@core/yamlHelpers";
import { validateFilenameFormat } from "../services/validationUtils";
import { extractIsoDateFromFilename } from "../services/dateUtils";
import {
  deriveJournalTitlesFromFilename,
  buildArchivesLinkTitle,
  buildRestesLinkTitle,
} from "../services/journalUtils";
import { createNoteFile } from "../services/fileUtils";

interface JournalModalResult {
  folderName: string;
  imageName: string;
}

export async function createJournal(app: App): Promise<void> {
  const result = await openJournalModal(app);
  if (!result) return;

  const folderName = result.folderName.trim();
  const imageName = result.imageName.trim();

  if (!validateFilenameFormat(folderName)) {
		new Notice(
		  [
				"Format attendu pour « Nom de dossier » :",
				"AAAA-MM-JJ-hh-mm - Titre complet.",
		  ].join("\n"),
		  6000
		);
		return;
  }

	const IMG_RE = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}_[A-Za-z0-9-]+_WP\.webp$/i;
	const imgOk = IMG_RE.test(imageName);
	if (!imgOk) {
		  new Notice(
			'Format attendu pour « Nom de l’image » : AAAA-MM-JJ-hh-mm_idphoto_WP.webp (ex: 2024-11-23-17-05_4075037_WP.webp).',
			6000
		  );
		  return;
	}

	const postDate = extractIsoDateFromFilename(folderName);
	if (!postDate) {
		  new Notice("Impossible d'extraire la date depuis « Nom de dossier ».", 6000);
		  return;
	}

	const { postTitre1, postTitre2, postTitreFull } = deriveJournalTitlesFromFilename(folderName);
	if (!postTitre1 || !postTitre2 || !postTitreFull) {
		  new Notice("Impossible de dériver les titres Journal.", 6000);
		  return;
	}

	const lienArchives = buildArchivesLinkTitle(postTitreFull);
	const lienRestes = buildRestesLinkTitle(postTitreFull);

	const journalInput = prepareJournalInput({
		  imageName,
		  titreCourt: postTitre1,
		  titreLong: postTitre2,
		  titreFull: postTitreFull,
		  dateIso: postDate,
		  lienArchives,
		  lienRestes,
	});

	const yaml = buildJournalYaml(journalInput);
	const sanitizedImageName = journalInput.img_filename?.[0] ?? imageName;
	const sanitizedTitreFull = journalInput.post_titre_full?.trim() || postTitreFull.trim();
	const body = [
		  "## Photo",
		  `![[${sanitizedImageName}]]`,
		  "",
		  "## Notes",
		  `![[${sanitizedTitreFull}_notes]]`,
	].join("\n");

	try {
				  const noteTitle = sanitizedTitreFull || postTitreFull;
				  const file = await createNoteFile(app.vault, noteTitle, yaml, body);
		  new Notice(`Note Journal créée : ${file.name}`, 4000);
	} catch (err: any) {
		  console.error("[pierregelas-fr] createJournal error:", err);
		  new Notice(`Erreur lors de la création de la note : ${err?.message ?? err}`, 8000);
	}
  }

  class JournalModal extends Modal {
	private resolve!: (result: JournalModalResult | null) => void;

	private folderName: string = "";
	private imageName: string = "";

	onOpen(): void {
		  const { contentEl } = this;
		  this.titleEl.setText("Créer une note Journal");

		  new Setting(contentEl)
			.setName("Nom de dossier")
			.setDesc("Format : AAAA-MM-JJ-hh-mm - Titre complet.")
			.addText((txt) => {
				  txt
					.setPlaceholder("2024-11-23-17-05 - Cinéma Saint-André des Arts. Paris 6e.")
					.onChange((v) => (this.folderName = v));
			});

		new Setting(contentEl)
		  .setName("Nom de l’image")
		  .setDesc("Format : AAAA-MM-JJ-hh-mm_idphoto_WP.webp (ex: 2024-11-23-17-05_4075037_WP.webp)")
		  .addText((txt) => {
				txt
				  .setPlaceholder("2024-11-23-17-05_4075037_WP.webp")
				  .onChange((v) => (this.imageName = v));
		  });

		const footer = contentEl.createDiv({ cls: "modal-button-container" });
		const btnCancel = footer.createEl("button", { text: "Annuler" });
		const btnCreate = footer.createEl("button", { text: "Créer", cls: "mod-cta" });

		btnCancel.addEventListener("click", () => this.closeWith(null));
		btnCreate.addEventListener("click", () => {
		  if (!validateFilenameFormat(this.folderName)) {
				new Notice(
				  [
						"Format attendu pour « Nom de dossier » :",
						"AAAA-MM-JJ-hh-mm - Titre complet.",
				  ].join("\n"),
				  6000
				);
				return;
		  }
		  if (!/_WP\.webp$/i.test((this.imageName ?? "").trim())) {
				new Notice(
				  'Format attendu pour « Nom de l’image » : …_WP.webp (ex: 2024-01-26_16_28_3109684_WP.webp).',
				  6000
				);
				return;
		  }
		  this.closeWith({
				folderName: this.folderName.trim(),
				imageName: (this.imageName ?? "").trim(),
		  });
		});
  }

  onClose(): void {
		this.contentEl.empty();
  }

  waitForClose(): Promise<JournalModalResult | null> {
		return new Promise<JournalModalResult | null>((resolve) => {
		  this.resolve = resolve;
		});
  }

  private closeWith(result: JournalModalResult | null): void {
		this.close();
		this.resolve(result);
  }
}

async function openJournalModal(app: App): Promise<JournalModalResult | null> {
  const modal = new JournalModal(app);
  modal.open();
  return modal.waitForClose();
}
