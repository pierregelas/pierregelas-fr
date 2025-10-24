// src/actions/createMinutes.ts
// Action: création d'une note Minutes avec YAML maître unifié

import type { App } from "obsidian";
import { Modal, Notice, Setting } from "obsidian";

import { buildMinutesYaml } from "@core/yamlMaster";
import { prepareMinutesInput } from "@core/yamlHelpers";
import {
  validateFilenameFormat,
  validateVideoLink,
  validationErrorMessage,
} from "../services/validationUtils";
import { extractIsoDateFromFilename, formatDateToFrench } from "../services/dateUtils";
import { extractTitleFromFilename, buildFullTitle } from "../services/titleUtils";
import { buildMinutesImageFilename } from "../services/imageUtils";
import { createNoteFile } from "../services/fileUtils";

interface MinutesModalResult {
  videoFilename: string;
  videoLink: string;
}

export async function createMinutes(app: App): Promise<void> {
  const result = await openMinutesModal(app);
  if (!result) return;

  const videoFilename = result.videoFilename.trim();
  const videoLink = result.videoLink.trim();

  if (!validateFilenameFormat(videoFilename)) {
		new Notice(validationErrorMessage("filename"), 6000);
		return;
  }
  if (!validateVideoLink(videoLink)) {
	  new Notice(validationErrorMessage("video"), 6000);
	  return;
}

const postDate = extractIsoDateFromFilename(videoFilename);
if (!postDate) {
	  new Notice("Impossible d'extraire la date depuis le nom du fichier.", 6000);
	  return;
}

const postTitre1 = extractTitleFromFilename(videoFilename);
if (!postTitre1) {
	  new Notice("Impossible d'extraire le titre depuis le nom du fichier.", 6000);
	  return;
}

const postTitre2 = formatDateToFrench(postDate);
if (!postTitre2) {
	  new Notice("Impossible de formater la date en français.", 6000);
	  return;
}

const postTitreFull = buildFullTitle(postTitre1, postTitre2);
const imgFilename = buildMinutesImageFilename(videoFilename);

const minutesInput = prepareMinutesInput({
	  imageName: imgFilename,
	  titreCourt: postTitre1,
	  titreLong: postTitre2,
	  titreFull: postTitreFull,
	  dateIso: postDate,
	  videoLink,
});

const yaml = buildMinutesYaml(minutesInput);
const sanitizedImageName = minutesInput.img_filename?.[0] ?? imgFilename;
const sanitizedVideoLink = minutesInput.post_vid_url ?? videoLink;
const sanitizedTitreFull = minutesInput.post_titre_full?.trim() || postTitreFull.trim();
const body = [
	  "## Vignette",
	  `![[${sanitizedImageName}]]`,
	  "",
	  "## Vidéo",
	  `![](${sanitizedVideoLink})`,
	  "",
	  "## Notes",
	  `![[${sanitizedTitreFull}_notes]]`,
].join("\n");

try {
			  const noteTitle = sanitizedTitreFull || postTitreFull;
			  const file = await createNoteFile(app.vault, noteTitle, yaml, body);
	  new Notice(`Note Minutes créée : ${file.name}`, 4000);
} catch (err: any) {
	  console.error("[pierregelas-fr] createMinutes error:", err);
	  new Notice(`Erreur lors de la création de la note : ${err?.message ?? err}`, 8000);
}
}

class MinutesModal extends Modal {
private resolve!: (result: MinutesModalResult | null) => void;

private videoFilename: string = "";
private videoLink: string = "";

onOpen(): void {
	  const { contentEl } = this;
	  this.titleEl.setText("Créer une note Minutes");

	  new Setting(contentEl)
		.setName("Nom du fichier vidéo")
		.setDesc("Format strict : AAAA-MM-JJ-hh-mm - Titre complet.")
		.addText((txt) => {
			  txt
				.setPlaceholder("2025-06-14-15-57 - Danse et manifestation, Place Léon Blum, Paris 11e.")
				.onChange((v) => (this.videoFilename = v));
		});
		new Setting(contentEl)
		  .setName("Lien de la vidéo")
		  .setDesc("URL https (YouTube, Vimeo, …)")
		  .addText((txt) => {
				txt
				  .setPlaceholder("https://youtu.be/xxxxxxxxxxx")
				  .onChange((v) => (this.videoLink = v));
		  });

		const footer = contentEl.createDiv({ cls: "modal-button-container" });
		const btnCancel = footer.createEl("button", { text: "Annuler" });
		const btnCreate = footer.createEl("button", { text: "Créer", cls: "mod-cta" });

		btnCancel.addEventListener("click", () => this.closeWith(null));
		btnCreate.addEventListener("click", () => {
		  if (!validateFilenameFormat(this.videoFilename)) {
				new Notice(validationErrorMessage("filename"), 6000);
				return;
		  }
		  if (!validateVideoLink(this.videoLink)) {
				new Notice(validationErrorMessage("video"), 6000);
				return;
		  }
		  this.closeWith({
				videoFilename: (this.videoFilename ?? "").trim(),
				videoLink: (this.videoLink ?? "").trim(),
		  });
		});
  }

  onClose(): void {
		this.contentEl.empty();
  }

  waitForClose(): Promise<MinutesModalResult | null> {
		return new Promise<MinutesModalResult | null>((resolve) => {
		  this.resolve = resolve;
		});
  }

  private closeWith(result: MinutesModalResult | null): void {
		this.close();
		this.resolve(result);
  }
}

async function openMinutesModal(app: App): Promise<MinutesModalResult | null> {
  const modal = new MinutesModal(app);
  modal.open();
  return modal.waitForClose();
}
