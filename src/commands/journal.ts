// src/commands/journal.ts
// Implémentation complète de la commande "Créer une note Journal"

import type { Plugin, App } from "obsidian";
import { Modal, Setting, Notice } from "obsidian";

import { validateFilenameFormat } from "../services/validationUtils";
import { extractIsoDateFromFilename } from "../services/dateUtils";
import {
  deriveJournalTitlesFromFilename,
  buildArchivesLinkTitle,
  buildRestesLinkTitle,
} from "../services/journalUtils";
import { buildJournalYaml } from "../services/yamlBuilder";
import { createNoteFile } from "../services/fileUtils";

/**
 * Enregistre la commande "Créer une note Journal".
 */
export function registerJournalCommand(plugin: Plugin): void {
  plugin.addCommand({
	id: "create-journal-note",
	name: "Créer une note Journal",
	callback: async () => {
	  const result = await openJournalModal(plugin.app);
	  if (!result) return; // annulé

	  const { folderName, imageName } = result;

	  // 1) Validations (conformes au doc)
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
	  // Image : structure attendue ..._WP.webp (doc). Validation simple et robuste.
		const IMG_RE = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}_[A-Za-z0-9-]+_WP\.webp$/i;
		const imgOk = typeof imageName === "string" && IMG_RE.test(imageName.trim());
		if (!imgOk) {
		  new Notice(
			'Format attendu pour « Nom de l’image » : AAAA-MM-JJ-hh-mm_idphoto_WP.webp (ex: 2024-11-23-17-05_4075037_WP.webp).',
			6000
		  );
		  return;
		}

		typeof imageName === "string" &&
		imageName.trim().length > 0 &&
		/_WP\.webp$/i.test(imageName.trim());
	  if (!imgOk) {
		new Notice(
		  'Format attendu pour « Nom de l’image » : …_WP.webp (ex: 2024-01-26-16-28_3109684_WP.webp).',
		  6000
		);
		return;
	  }

	  // 2) Dérivations (date/titres/liens)
	  const postDate = extractIsoDateFromFilename(folderName);
	  if (!postDate) {
		new Notice("Impossible d'extraire la date depuis « Nom de dossier ».", 6000);
		return;
	  }

	  const { postTitre1, postTitre2, postTitreFull } =
		deriveJournalTitlesFromFilename(folderName);

	  if (!postTitre1 || !postTitre2 || !postTitreFull) {
		new Notice("Impossible de dériver les titres Journal.", 6000);
		return;
	  }

	  const lienArchives = buildArchivesLinkTitle(postTitreFull);
	  const lienRestes = buildRestesLinkTitle(postTitreFull);

	  // 3) YAML complet (toutes les clés, y compris vides)
	  const yaml = buildJournalYaml({
		imgFilename: imageName.trim(),
		postTitre1,
		postTitre2,
		postTitreFull,
		postDate,
		lienArchives,
		lienRestes,
	  });

	  // 4) Corps de note
	  const body = [
		"## Photo",
		`![[${imageName.trim()}]]`,
		"",
		"## Notes",
		`![[${postTitreFull}_notes]]`,
	  ].join("\n");

	  // 5) Création du fichier .md (nom = post_titre_full)
	  try {
		const file = await createNoteFile(plugin.app.vault, postTitreFull, yaml, body);
		new Notice(`Note Journal créée : ${file.name}`, 4000);
	  } catch (err: any) {
		console.error("[pierregelas-fr] createNoteFile error:", err);
		new Notice(`Erreur lors de la création de la note : ${err?.message ?? err}`, 8000);
	  }
	},
  });
}

/* -------------------------- Modal de saisie -------------------------- */

interface JournalModalResult {
  folderName: string; // "AAAA-MM-JJ-hh-mm - Titre…"
  imageName: string;  // "..._WP.webp"
}

class JournalModal extends Modal {
  private resolve!: (result: JournalModalResult | null) => void;

  private folderName: string = "";
  private imageName: string = "";

  onOpen(): void {
	const { contentEl } = this;
	this.titleEl.setText("Créer une note Journal");

	// Champ 1 — Nom de dossier
	new Setting(contentEl)
	  .setName("Nom de dossier")
	  .setDesc("Format : AAAA-MM-JJ-hh-mm - Titre complet.")
	  .addText((txt) => {
		txt.setPlaceholder("2024-11-23-17-05 - Cinéma Saint-André des Arts. Paris 6e.")
		  .onChange((v) => (this.folderName = v));
	  });

	// Champ 2 — Nom de l'image
	new Setting(contentEl)
	  .setName("Nom de l’image")
	  .setDesc("Format : AAAA-MM-JJ-hh-mm_idphoto_WP.webp (ex: 2024-11-23-17-05_4075037_WP.webp)")
	  .addText((txt) => {
		txt.setPlaceholder("2024-11-23-17-05_4075037_WP.webp")
		  .onChange((v) => (this.imageName = v));
	  });

	// Boutons
	const footer = contentEl.createDiv({ cls: "modal-button-container" });
	const btnCancel = footer.createEl("button", { text: "Annuler" });
	const btnCreate = footer.createEl("button", { text: "Créer", cls: "mod-cta" });

	btnCancel.addEventListener("click", () => this.closeWith(null));
	btnCreate.addEventListener("click", () => {
	  // validations légères avant fermeture
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
	  if (
		!this.imageName ||
		!/_WP\.webp$/i.test(this.imageName.trim())
	  ) {
		new Notice(
		  'Format attendu pour « Nom de l’image » : …_WP.webp (ex: 2024-01-26_16_28_3109684_WP.webp).',
		  6000
		);
		return;
	  }
	  this.closeWith({
		folderName: this.folderName.trim(),
		imageName: this.imageName.trim(),
	  });
	});
  }

  onClose(): void {
	const { contentEl } = this;
	contentEl.empty();
  }

  public waitForClose(): Promise<JournalModalResult | null> {
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
  return await modal.waitForClose();
}
