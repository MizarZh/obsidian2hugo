import { App, TAbstractFile, TFile } from "obsidian";
import {
  isInPath,
  getRelativePath,
  tripleSplit,
  multiSplit,
  join,
} from "./utils";
import { writeFile } from "fs/promises";
// import Obsidian2Hugo from "./main";

enum linkType {
  Raw,
  Link,
  Embed,
}

interface seq {
  text: string;
  modText: string;
  type: linkType;
  path: string;
  start: number;
  end: number;
}

export function folder2folder(
  app: App,
  inputFolder: string,
  exportFolder: string
) {
  const abstractFiles = app.vault.getAllLoadedFiles();
  const files: TFile[] = [];
  abstractFiles.forEach((file: TAbstractFile) => {
    if (
      file instanceof TFile &&
      ["md"].contains(file.extension) &&
      isInPath(inputFolder, file.parent?.path)
    ) {
      // reuse isInPath to include in an object
      files.push(file);
    }
  });
  files.forEach(async (file: TFile) => {
    const metadata = this.app.metadataCache.getFileCache(file);
    const links = metadata?.links;
    const embeds = metadata?.embeds;
    const text = await this.app.vault.cachedRead(file);
    const seqArray: Array<seq> = [];
    if (links !== undefined) {
      for (let i = 0; i < links.length; i++) {
        // get relative path
        const file = this.app.metadataCache.getFirstLinkpathDest(
          links[i].link,
          inputFolder
        );
        const relativePath = getRelativePath(inputFolder, file.path);

        // substitute link from obs to hugo
        const obsLink = text.slice(
          links[i].position.start.offset,
          links[i].position.end.offset
        );

        seqArray.push({
          text: obsLink,
          modText: `[${links[i].displayText}]({{<ref "${relativePath}">}})`,
          type: linkType.Link,
          path: relativePath,
          start: links[i].position.start.offset,
          end: links[i].position.end.offset,
        });
      }
    }
    if (embeds !== undefined) {
      for (let i = 0; i < embeds.length; i++) {
        const file = this.app.metadataCache.getFirstLinkpathDest(
          embeds[i].link,
          inputFolder
        );
        const relativePath = getRelativePath(inputFolder, file.path);

        const obsLink = text.slice(
          embeds[i].position.start.offset,
          embeds[i].position.end.offset
        );

        seqArray.push({
          text: obsLink,
          modText: `{{<figure src="${relativePath}"> title="${embeds[i].displayText}"}}`,
          type: linkType.Embed,
          path: relativePath,
          start: embeds[i].position.start.offset,
          end: embeds[i].position.end.offset,
        });
      }
    }
    seqArray.sort((a, b) => a.start - b.start);
    const pos: Array<number> = [0];
    for (let i = 0; i < seqArray.length; i++) {
      pos.push(seqArray[i].start);
      pos.push(seqArray[i].end);
    }
    const multiSplitText = multiSplit(text, pos);

    for (let i = 0; i < seqArray.length; i++) {
      const ii = i * 2 + 1;
      multiSplitText[ii] = seqArray[i].modText;
    }

    const finalText = multiSplitText.join("");

    await writeFile(join(exportFolder, file.name), finalText);

    console.log(finalText);
  });
}
