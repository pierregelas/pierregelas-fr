// src/commands/minutes.ts
// Implémentation complète de la commande "Créer une note Minutes"

import type { Plugin, App } from "obsidian";
import { Modal, Setting, Notice } from "obsidian";

import { validateFilenameFormat, validateVideoLink, validationErrorMessage } from "../services/validationUtils";
import { extractIsoDateFromFilename, formatDateToFrench } from "../services/dateUtils";
import { extractTitleFromFilename, buildFullTitle } from "../services/titleUtils";
import { buildMinutesImageFilename } from "../services/imageUtils";
import { buildMinutesYaml } from "../services/yamlBuilder";
import { createNoteFile } from "../services/fileUtils";

/**
 * Enregistre la commande "Créer une note Minutes".
 */
export function registerMinutesCommand(plugin: Plugin): void {
  plugin.addCommand({
	id: "create-minutes-note",
	name: "Créer une note Minutes",
	callback: async () => {
	  const result = await openMinutesModal(plugin.app);
	  if (!result) return; // annulé

	  const { videoFilename, videoLink } = result;

	  // 1) Validations finales (sécurité)
	  if (!validateFilenameFormat(videoFilename)) {
		new Notice(validationErrorMessage("filename"), 6000);
		return;
	  }
	  if (!validateVideoLink(videoLink)) {
		new Notice(validationErrorMessage("video"), 6000);
		return;
	  }

	  // 2) Dérivations
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

	  // 3) YAML complet (toutes les clés, y compris vides)
	  const yaml = buildMinutesYaml({
		imgFilename,
		postTitre1,
		postTitre2,
		postTitreFull,
		postDate,
		postVidUrl: videoLink,
	  });

	  // 4) Corps de note
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

	  // 5) Création du fichier .md (à la racine du vault, pas de dossier spécifique)
	  try {
		const file = await createNoteFile(plugin.app.vault, postTitreFull, yaml, body);
		new Notice(`Note Minutes créée : ${file.name}`, 4000);
	  } catch (err: any) {
		console.error("[pierregelas-fr] createNoteFile error:", err);
		new Notice(`Erreur lors de la création de la note : ${err?.message ?? err}`, 8000);
	  }
	},
  });
}

/* -------------------------- Modal de saisie -------------------------- */

interface MinutesModalResult {
  videoFilename: string; // "AAAA-MM-JJ-hh-mm - Titre…"
  videoLink: string;     // URL https
}

class MinutesModal extends Modal {
  private resolve!: (result: MinutesModalResult | null) => void;

  private videoFilename: string = "";
  private videoLink: string = "";

  onOpen(): void {
	const { contentEl } = this;
	this.titleEl.setText("Créer une note Minutes");

	// Champ 1 — Nom du fichier vidéo
	new Setting(contentEl)
	  .setName("Nom du fichier vidéo")
	  .setDesc("Format strict : AAAA-MM-JJ-hh-mm - Titre complet.")
	  .addText((txt) => {
		txt.setPlaceholder("2025-06-14-15-57 - Danse et manifestation, Place Léon Blum, Paris 11e.")
		  .onChange((v) => (this.videoFilename = v));
	  });

	// Champ 2 — Lien de la vidéo
	new Setting(contentEl)
	  .setName("Lien de la vidéo")
	  .setDesc("URL https (YouTube, Vimeo, …)")
	  .addText((txt) => {
		txt.setPlaceholder("https://youtu.be/xxxxxxxxxxx")
		  .onChange((v) => (this.videoLink = v));
	  });

	// Boutons
	const footer = contentEl.createDiv({ cls: "modal-button-container" });
	const btnCancel = footer.createEl("button", { text: "Annuler" });
	const btnCreate = footer.createEl("button", { text: "Créer", cls: "mod-cta" });

	btnCancel.addEventListener("click", () => this.closeWith(null));
	btnCreate.addEventListener("click", () => {
	  // validations simples avant fermeture
	  if (!validateFilenameFormat(this.videoFilename)) {
		new Notice(validationErrorMessage("filename"), 6000);
		return;
	  }
	  if (!validateVideoLink(this.videoLink)) {
		new Notice(validationErrorMessage("video"), 6000);
		return;
	  }
	  this.closeWith({
		videoFilename: this.videoFilename.trim(),
		videoLink: this.videoLink.trim(),
	  });
	});
  }

  onClose(): void {
	const { contentEl } = this;
	contentEl.empty();
  }

  public waitForClose(): Promise<MinutesModalResult | null> {
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
  return await modal.waitForClose();
}
