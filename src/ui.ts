import { AbstractInputSuggest, TAbstractFile, TFile, TFolder } from "obsidian";
import { trimFile } from "./utils";

export class FileSuggest extends AbstractInputSuggest<TFile> {
  textInputEl: HTMLInputElement;

  getSuggestions(inputStr: string): TFile[] {
    const abstractFiles = this.app.vault.getAllLoadedFiles();
    const files: TFile[] = [];
    const inputLower = inputStr.toLowerCase();

    abstractFiles.forEach((file: TAbstractFile) => {
      if (
        file instanceof TFile &&
        ["md", "canvas"].contains(file.extension) &&
        file.path.toLowerCase().contains(inputLower)
      ) {
        files.push(file);
      }
    });

    return files;
  }

  renderSuggestion(file: TFile, el: HTMLElement) {
    if (file.extension == "md") {
      el.setText(trimFile(file));
    } else {
      //we don't use trimFile here as the extension isn't displayed here
      el.setText(file.path.slice(0, -7));
    }
  }

  selectSuggestion(file: TFile) {
    this.textInputEl.value = trimFile(file);
    this.textInputEl.trigger("input");
    this.close();
  }
}

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  textInputEl: HTMLInputElement;

  getSuggestions(inputStr: string): TFolder[] {
    const abstractFiles = this.app.vault.getAllLoadedFiles();
    const folders: TFolder[] = [];
    const inputLower = inputStr.toLowerCase();

    abstractFiles.forEach((folder: TAbstractFile) => {
      if (
        folder instanceof TFolder &&
        folder.path.toLowerCase().contains(inputLower)
      ) {
        folders.push(folder);
      }
    });

    return folders;
  }

  renderSuggestion(folder: TFolder, el: HTMLElement) {
    return el.setText(folder.path);
  }

  selectSuggestion(folder: TFolder) {
    this.textInputEl.value = folder.path;
    this.textInputEl.trigger("input");
    this.close();
  }
}
