// src/main.ts
import { Plugin } from "obsidian";
import { registerMinutesCommand } from "./commands/minutes";
import { registerJournalCommand } from "./commands/journal";
import { registerArchivesCommand } from "./commands/archives";
import { registerJournalRecalcCommand } from "./commands/journalRecalc";
import { registerRestesCommand } from "./commands/restes";
import { registerTagsCommand } from "./commands/tags"; // ✅ NEW
import { loadSettings, saveSettings, PierregelasSettingTab } from "./settings";
import { registerImportWordpressCommand } from "./ui/commands";

export default class PierregelasPlugin extends Plugin {
  async onload() {
	console.log("pierregelas.fr plugin loaded");
	// Settings
	// @ts-ignore
	this.settings = await loadSettings(this);
	this.addSettingTab(new PierregelasSettingTab(this.app, this));

	registerMinutesCommand(this);
	registerJournalCommand(this);
	registerArchivesCommand(this);
	registerJournalRecalcCommand(this);
	registerRestesCommand(this);
	registerTagsCommand(this); // ✅ NEW
	registerImportWordpressCommand(this.app, spec => this.addCommand(spec));
  }

  onunload() {
	console.log("pierregelas.fr plugin unloaded");
  }
}
