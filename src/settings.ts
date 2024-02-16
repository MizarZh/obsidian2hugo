import { PluginSettingTab, Setting, App } from "obsidian";
import Obsidian2Hugo from "./main";
import { FileSuggest, FolderSuggest } from "./ui";

export interface Settings {
  exposeFolder: string;
  blogRoot: string;
  outputPostFolder: string;
  isRelative: boolean;
  outputStaticFolder: string;
  staticConfig: string;
}

export const DEFAULT_SETTINGS: Settings = {
  exposeFolder: "",
  blogRoot: "",
  outputPostFolder: "content/posts",
  isRelative: false,
  outputStaticFolder: "static",
  staticConfig: `{
    "images": "png|jpg|svg|webp",
    "other": "pdf"
}`,
};

export class SettingTab extends PluginSettingTab {
  plugin: Obsidian2Hugo;

  constructor(app: App, plugin: Obsidian2Hugo) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Expose folder")
      .setDesc("folder you want to expose")
      .addText((text) => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setValue(this.plugin.settings.exposeFolder)
          .onChange(async (text) => {
            this.plugin.settings.exposeFolder = text;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Blog path")
      .setDesc("path to the root path of the blog")
      .addText((text) => {
        text.setValue(this.plugin.settings.blogRoot).onChange(async (text) => {
          this.plugin.settings.blogRoot = text;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Blog posts folder")
      .setDesc("path to the post folder with respects to blog root")
      .addText((text) => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setValue(this.plugin.settings.outputPostFolder)
          .onChange(async (text) => {
            this.plugin.settings.outputPostFolder = text;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Blog static folder")
      .setDesc("path to the static folder with respects to blog root")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.outputStaticFolder)
          .onChange(async (text) => {
            this.plugin.settings.outputStaticFolder = text;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Static file config")
      .setDesc("config json file for static file")
      .addTextArea((text) => {
        text
          .setValue(this.plugin.settings.staticConfig)
          .onChange(async (text) => {
            this.plugin.settings.staticConfig = text;
            await this.plugin.saveSettings();
          });
        text.inputEl.addClass('static-file-config');
      });
  }
}
