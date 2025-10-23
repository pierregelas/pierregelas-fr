// src/actions/createMinutes.ts
// Action: création d'une note Minutes avec YAML maître unifié

import type { App } from "obsidian";
import { Modal, Notice, Setting } from "obsidian";

import { buildYamlMaster, createEmptyMasterFields } from "@core/yamlMaster";
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

  const master = createEmptyMasterFields();
  master.cover = imgFilename;
  master.img_alt = [postTitre1];
  master.img_filename = [imgFilename];
  master.img_legende = [postTitreFull];
  master.lien_archives = null;
  master.lien_journal = null;
  master.lien_projet = ["[[Vidéo]]", "[[Minutes]]"];
  master.lien_restes = null;
  master.maj_wp = true;
  master.post_cat = ["video", "minutes"];
  master.post_date = postDate;
  master.post_descr = null;
  master.post_extrait = null;
  master.post_id = "";
  master.post_mod = postDate;
  master.post_perma = null;
  master.post_titre_1 = postTitre1;
  master.post_titre_2 = postTitre2;
  master.post_titre_full = postTitreFull;
  master.post_vid_url = videoLink;
  master.tags = [];
  master.wp_carnet_link = null;
  master.wp_carnet_on = false;
  master.wp_status = null;
  master.wp_import_dataset_key = null;
  master.wp_import_dataset_id = null;

  const yaml = buildYamlMaster(master, "minutes");
  const body = [
		"## Vignette",
		`![[${imgFilename}]]`,
		"",
		"## Vidéo",
		`![](${videoLink})`,
		"",
		"## Notes",
		`![[${postTitreFull}_notes]]`,
  ].join("\n");

  try {
		const file = await createNoteFile(app.vault, postTitreFull, yaml, body);
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
