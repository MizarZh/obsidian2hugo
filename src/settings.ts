import { PluginSettingTab, Setting, App } from "obsidian";
import Obsidian2Hugo from "./main";
import { FileSuggest, FolderSuggest } from "./ui";

export interface Settings {
  blogRoot: string;
  outputPostFolder: string;
  isRelative: boolean;
  outputAssetFolder: string;
  exportFolder: string;
  inputFolder: string;
  assetFolder: string;
}

export const DEFAULT_SETTINGS: Settings = {
  blogRoot: "",
  outputPostFolder: "",
  isRelative: false,
  outputAssetFolder: "",
  exportFolder: "",
  inputFolder: "",
  assetFolder: "",
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

    // new Setting(containerEl)
    //   .setName("Setting #1")
    //   .setDesc("It's a secret")
    //   .addText((text) =>
    //     text
    //       .setPlaceholder("Enter your secret")
    //       .setValue(this.plugin.settings.mySetting)
    //       .onChange(async (value) => {
    //         this.plugin.settings.mySetting = value;
    //         await this.plugin.saveSettings();
    //       })
    //   );

    new Setting(containerEl)
      .setName("Folder path")
      .setDesc("path you want to be exported")
      .addText((text) => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setValue(this.plugin.settings.inputFolder)
          .onChange(async (evt) => {
            this.plugin.settings.inputFolder = evt;
            await this.plugin.saveSettings();
          });
      });

    // new Setting(containerEl)
    //   .setName("Asset path")
    //   .setDesc("path where assets are located")
    //   .addText((text) => {
    //     new FileSuggest(this.app, text.inputEl);
    //   });

    new Setting(containerEl)
      .setName("Export path")
      .setDesc("path you want to export to")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.exportFolder)
          .onChange(async (evt) => {
            this.plugin.settings.exportFolder = evt;
            await this.plugin.saveSettings();
          });
      });
  }
}
