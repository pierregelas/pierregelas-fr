// src/settings.ts
import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

/* -------------------- Types & defaults -------------------- */

export interface PierregelasSettings {
  /** Active l’écriture de logs Markdown (wp_tags/logs_tests). */
  loggingEnabled: boolean;
}

export const DEFAULT_SETTINGS: PierregelasSettings = {
  loggingEnabled: true,
};

/* -------------------- Helpers charge/sauve -------------------- */

export async function loadSettings(plugin: Plugin): Promise<PierregelasSettings> {
  const data = (await plugin.loadData()) ?? {};
  const merged: PierregelasSettings = { ...DEFAULT_SETTINGS, ...data };
  // @ts-ignore attach for easy access
  plugin.settings = merged;
  return merged;
}

export async function saveSettings(plugin: Plugin): Promise<void> {
  // @ts-ignore read back
  await plugin.saveData(plugin.settings ?? DEFAULT_SETTINGS);
}

/** Lecture sûre côté commandes. */
export function isLoggingEnabled(plugin: Plugin): boolean {
  // @ts-ignore
  return !!plugin?.settings?.loggingEnabled;
}

/* -------------------- UI Settings Tab -------------------- */

export class PierregelasSettingTab extends PluginSettingTab {
  plugin: Plugin;

  constructor(app: App, plugin: Plugin) {
	super(app, plugin);
	this.plugin = plugin;
  }

  display(): void {
	const { containerEl } = this;
	containerEl.empty();

	containerEl.createEl("h2", { text: "Paramètres – pierregelas.fr" });

	new Setting(containerEl)
	  .setName("Écrire des logs d’actions")
	  .setDesc("Quand activé, chaque exécution écrit un log Markdown dans wp_tags/logs_tests/.")
	  .addToggle((tg) => {
		// @ts-ignore
		tg.setValue(!!this.plugin.settings?.loggingEnabled).onChange(async (v) => {
		  // @ts-ignore
		  this.plugin.settings.loggingEnabled = !!v;
		  await saveSettings(this.plugin);
		});
	  });
  }
}
