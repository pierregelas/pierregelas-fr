// src/main.ts
import { Plugin } from "obsidian";
import { createMinutes } from "./actions/createMinutes";
import { createJournal } from "./actions/createJournal";
import { createArchivesFromJournal, updateArchivesFromJournal } from "./actions/createArchives";
import { createRestesFromJournal, updateRestesFromJournal } from "./actions/createRestes";
import { registerJournalRecalcCommand } from "./actions/journalRecalc";
import { registerTagsCommand } from "./actions/tags";
import { registerModifyNoteCommand } from "./actions/modifyNote";
import { loadSettings, saveSettings, PierregelasSettingTab } from "./settings";
import { registerImportWordpressCommand } from "./ui/commands";

export default class PierregelasPlugin extends Plugin {
  async onload() {
	console.log("pierregelas.fr plugin loaded");
	// Settings
	// @ts-ignore
	this.settings = await loadSettings(this);
	this.addSettingTab(new PierregelasSettingTab(this.app, this));

		this.addCommand({
		  id: "create-minutes-note",
		  name: "Créer une note Minutes",
		  callback: () => createMinutes(this.app),
		});
		this.addCommand({
		  id: "create-journal-note",
		  name: "Créer une note Journal",
		  callback: () => createJournal(this.app),
		});
		this.addCommand({
		  id: "create-archives-from-journal",
		  name: "Créer/Mettre à jour une note Archives du futur (P1)",
		  callback: () => createArchivesFromJournal(this.app),
		});
		this.addCommand({
		  id: "update-archives-from-journal",
		  name: "Mettre à jour une note Archives du futur (P2)",
		  callback: () => updateArchivesFromJournal(this.app),
		});
		registerJournalRecalcCommand(this);
		this.addCommand({
		  id: "create-restes-from-journal",
		  name: "Créer/Mettre à jour une note Restes du futur (P1)",
		  callback: () => createRestesFromJournal(this.app),
		});
		this.addCommand({
		  id: "update-restes-from-journal",
		  name: "Mettre à jour une note Restes du futur (P2)",
		  callback: () => updateRestesFromJournal(this.app),
		});
		registerTagsCommand(this); // ✅ NEW
		registerModifyNoteCommand(this.app, spec => this.addCommand(spec));
		registerImportWordpressCommand(this.app, spec => this.addCommand(spec));
  }

  onunload() {
	console.log("pierregelas.fr plugin unloaded");
  }
}
