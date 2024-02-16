import { App, Editor, MarkdownView, Modal, Notice, Plugin } from "obsidian";
import { SettingTab, Settings, DEFAULT_SETTINGS } from "./settings";
import { export2hugo } from "./convert";

// Remember to rename these classes and interfaces!

export default class Obsidian2Hugo extends Plugin {
  settings: Settings;

  async onload() {
    await this.loadSettings();

    const exportFolder = () => {
      try {
        export2hugo(this.app, this.settings);
        new Notice("Export done!");
      } catch (e) {
        new Notice(e);
      }
    };

    const ribbonIconEl = this.addRibbonIcon(
      "arrow-right-from-line",
      "Export to Hugo",
      (evt: MouseEvent) => {
        exportFolder();
      }
    );
    ribbonIconEl.addClass("my-plugin-ribbon-class");

    this.addCommand({
      id: "obsidian2hugo-export-folder",
      name: "Export the selected folder",
      callback: () => {
        exportFolder();
      },
    });

    this.addCommand({
      id: "obsidian2hugo-export-file",
      name: "Export single file",
      callback: () => {},
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
