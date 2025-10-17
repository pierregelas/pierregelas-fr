// src/modals/simpleInfoModal.ts
import type { App } from "obsidian";
import { Modal } from "obsidian";

export function openInfoModal(
  app: App,
  title: string,
  message: string,
  buttonText = "OK"
): Promise<void> {
  return new Promise<void>((resolve) => {
	class InfoModal extends Modal {
	  onOpen(): void {
		this.titleEl.setText(title);
		const p = this.contentEl.createEl("p");
		p.textContent = message;

		const footer = this.contentEl.createDiv({ cls: "modal-button-container" });
		const btn = footer.createEl("button", { text: buttonText, cls: "mod-cta" });
		btn.addEventListener("click", () => this.close());
	  }
	  onClose(): void {
		this.contentEl.empty();
		resolve();
	  }
	}
	new InfoModal(app).open();
  });
}
