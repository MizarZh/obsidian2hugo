import {
  App,
  TAbstractFile,
  TFile,
  FileSystemAdapter,
  CachedMetadata,
} from "obsidian";
import { isInPath, getRelativePath, multiSplit, join } from "./utils";
// import { writeFile, copyFile } from "fs/promises";
import { copy, outputFile } from "fs-extra";
// import Obsidian2Hugo from "./main";

enum linkType {
  Raw,
  Link,
  Embed,
}

interface Seq {
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
  exposeFolder: string,
  blogRoot: string,
  outputPostFolder: string,
  outputStaticFolder: string,
  staticConfig: string
) {
  const postsDire = join(blogRoot, outputPostFolder),
    assetsDire = join(blogRoot, outputStaticFolder),
    staticConfigJSON = JSON.parse(staticConfig);

  // @ts-ignore
  const adapter = app.vault.adapter;
  let basePath = "";
  if (adapter instanceof FileSystemAdapter) {
    basePath = adapter.getBasePath();
  }

  const abstractFiles = app.vault.getAllLoadedFiles();
  const files: TFile[] = [];
  abstractFiles.forEach((file: TAbstractFile) => {
    if (
      file instanceof TFile &&
      ["md"].contains(file.extension) &&
      isInPath(exposeFolder, file.parent?.path)
    ) {
      // reuse isInPath to include in an object
      files.push(file);
    }
  });
  files.forEach(async (file: TFile) => {
    const metadata = this.app.metadataCache.getFileCache(file);
    const rawText = await this.app.vault.cachedRead(file);
    const seqArray: Array<Seq> = [];
    genSeqArray(
      metadata,
      seqArray,
      exposeFolder,
      outputStaticFolder,
      staticConfig,
      rawText
    );
    seqArray.sort((a, b) => a.start - b.start);
    const pos: Array<number> = [0];

    for (let i = 0; i < seqArray.length; i++) {
      pos.push(seqArray[i].start);
      pos.push(seqArray[i].end);
    }
    const multiSplitText = multiSplit(rawText, pos);

    for (let i = 0; i < seqArray.length; i++) {
      const ii = i * 2 + 1;
      multiSplitText[ii] = seqArray[i].modText;

      // if the link links to a resource
      // then copy it to the directory
      for (const j in staticConfigJSON) {
        if (staticConfigJSON[j].split("|").contains(seqArray[i].ext)) {
          await copy(
            join(basePath, seqArray[i].path),
            join(join(assetsDire, j), seqArray[i].name)
          );
        }
      }
    }

    const finalText = multiSplitText.join("");
    const relativePath = getRelativePath(exposeFolder, file.path);
    await outputFile(join(postsDire, relativePath), finalText);
  });
}

function genSeqArray(
  metadata: CachedMetadata,
  seqArray: Array<Seq>,
  exposeFolder: string,
  outputStaticFolder: string,
  staticConfig: string,
  rawText: string
) {
  const links = metadata?.links;
  const embeds = metadata?.embeds;
  if (links !== undefined) {
    for (let i = 0; i < links.length; i++) {
      // get relative path
      const file = this.app.metadataCache.getFirstLinkpathDest(
        links[i].link,
        exposeFolder
      );
      if (file === null) {
        const obsLink = rawText.slice(
          links[i].position.start.offset,
          links[i].position.end.offset
        );

        seqArray.push({
          text: obsLink,
          modText: `[${links[i].displayText}]({{<ref "${links[i].link}">}})`,
          name: "",
          ext: "",
          type: linkType.Link,
          path: links[i].link,
          relativePath: "",
          start: links[i].position.start.offset,
          end: links[i].position.end.offset,
        });
      } else {
        const relativePath = getRelativePath(exposeFolder, file.path);

        // substitute link from obs to hugo
        const obsLink = rawText.slice(
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
  }
  if (embeds !== undefined) {
    for (let i = 0; i < embeds.length; i++) {
      const file = this.app.metadataCache.getFirstLinkpathDest(
        embeds[i].link,
        exposeFolder
      );
      const relativePath = getRelativePath(exposeFolder, file.path);

      const obsLink = rawText.slice(
        embeds[i].position.start.offset,
        embeds[i].position.end.offset
      );

      seqArray.push({
        text: obsLink,
        modText: `{{<figure src="${join(
          "/",
          join(
            outputStaticFolder.split("/").slice(1).push(staticConfig).join("/"),
            file.name
          )
        )}" title="${embeds[i].displayText}">}}`,
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
}
