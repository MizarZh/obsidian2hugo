import { App, TAbstractFile, TFile, FileSystemAdapter } from "obsidian";
import { isInPath, getRelativePath, multiSplit, join } from "./utils";
// import { writeFile, copyFile } from "fs/promises";
import { copy, outputFile } from "fs-extra";
// import Obsidian2Hugo from "./main";

enum linkType {
  Raw,
  Link,
  Embed,
}

interface seq {
  text: string;
  modText: string;
  name: string;
  ext: string;
  type: linkType;
  path: string;
  relativePath: string;
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
  // @ts-ignore
  const adapter = app.vault.adapter;
  let basePath = "";
  if (adapter instanceof FileSystemAdapter) {
    basePath = adapter.getBasePath();
  }
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
          name: file.name,
          ext: file.extension,
          type: linkType.Link,
          path: file.path,
          relativePath,
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
          modText: `{{<figure src="${file.path}"> title="${embeds[i].displayText}"}}`,
          name: file.name,
          ext: file.extension,
          type: linkType.Embed,
          path: file.path,
          relativePath,
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

      // if the link links to a resource
      // then copy it to the directory
      if ("png|jpg|svg|webp|pdf".split("|").includes(seqArray[i].ext)) {
        await copy(
          join(basePath, seqArray[i].path),
          join(exportFolder, `assets/${seqArray[i].name}`)
        );
      }
    }

    const finalText = multiSplitText.join("");

    await outputFile(join(exportFolder, file.name), finalText);
  });
}
