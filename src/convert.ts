import {
  App,
  TAbstractFile,
  TFile,
  FileSystemAdapter,
  CachedMetadata,
  ReferenceCache,
} from "obsidian";
import { isInPath, getRelativePath, multiSplit, join } from "./utils";
// import { writeFile, copyFile } from "fs/promises";
import { copy, outputFile } from "fs-extra";
import { Settings } from "./settings";
// import Obsidian2Hugo from "./main";

enum linkType {
  Raw,
  Link,
  Embed,
}

interface Seq {
  raw: string;
  name: string;
  display: string;
  ext: string;
  type: linkType;
  path: string;
  relativePath: string;
  start: number;
  end: number;
}

export function transfer(app: App, settings: Settings) {
  const { exposeFolder, staticConfig, blogRoot, outputPostFolder } = settings;
  const abstractFiles = app.vault.getAllLoadedFiles(),
    files: TFile[] = [];
  const staticConfigJSON = JSON.parse(staticConfig);
  const postsDire = join(blogRoot, outputPostFolder);

  // basePath of the vault
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
      isInPath(exposeFolder, file.parent?.path)
    ) {
      files.push(file);
    }
  });
  // link gathering
  files.forEach(async (file: TFile) => {
    const metadata = this.app.metadataCache.getFileCache(file);
    const rawText = await this.app.vault.cachedRead(file);
    const seqArray: Array<Seq> = [];
    genSeqArray(metadata, settings, seqArray, rawText);
    seqArray.sort((a, b) => a.start - b.start);

    // auxiliary pos for multisplit
    const pos: Array<number> = [0];
    for (let i = 0; i < seqArray.length; i++) {
      pos.push(seqArray[i].start);
      pos.push(seqArray[i].end);
    }
    const multiSplitText = multiSplit(rawText, pos);

    // export resources
    for (let i = 0; i < seqArray.length; i++) {
      const ii = i * 2 + 1;

      // if the link links to a resource
      // then copy it to the directory
      const hugoLink = await genHugoShortcode(
        seqArray[i],
        settings,
        staticConfigJSON,
        basePath
      );
      multiSplitText[ii] = hugoLink;
    }
    // export document
    const finalText = multiSplitText.join("");
    const relativePath = getRelativePath(exposeFolder, file.path);
    await outputFile(join(postsDire, relativePath), finalText);
  });
}

function genSeqArray(
  metadata: CachedMetadata,
  settings: Settings,
  seqArray: Seq[],
  rawText: string
) {
  const { exposeFolder } = settings;
  const links = metadata?.links;
  const embeds = metadata?.embeds;

  if (links !== undefined) {
    for (let i = 0; i < links.length; i++) {
      // get relative path
      const file = this.app.metadataCache.getFirstLinkpathDest(
        links[i].link,
        exposeFolder
      );

      genSeq(file, links[i], settings, linkType.Link, seqArray, rawText);
    }
  }
  if (embeds !== undefined) {
    for (let i = 0; i < embeds.length; i++) {
      const file = this.app.metadataCache.getFirstLinkpathDest(
        embeds[i].link,
        exposeFolder
      );
      genSeq(file, embeds[i], settings, linkType.Embed, seqArray, rawText);
    }
  }
}

function genSeq(
  file: TFile,
  link: ReferenceCache,
  settings: Settings,
  type: linkType,
  seqArray: Seq[],
  rawText: string
) {
  const { exposeFolder } = settings;
  const obsLink = rawText.slice(
    link.position.start.offset,
    link.position.end.offset
  );
  if (file === null) {
    seqArray.push({
      raw: obsLink,
      name: link.original,
      display: link.displayText as string,
      ext: "",
      type,
      path: link.link,
      relativePath: "",
      start: link.position.start.offset,
      end: link.position.end.offset,
    });
  } else {
    const relativePath = getRelativePath(exposeFolder, file.path);
    // substitute link from obs to hugo
    seqArray.push({
      raw: obsLink,
      name: file.name,
      display: link.displayText as string,
      ext: file.extension,
      type,
      path: file.path,
      relativePath,
      start: link.position.start.offset,
      end: link.position.end.offset,
    });
  }
}

async function genHugoShortcode(
  seq: Seq,
  setting: Settings,
  config: Record<string, string>,
  basePath: string
): Promise<string> {
  const { blogRoot, outputStaticFolder } = setting;
  const assetsDire = join(blogRoot, outputStaticFolder);
  if (seq.type === linkType.Link) {
    return `[${seq.display}]({{<ref "${seq.relativePath}">}})`;
  } else if (seq.type === linkType.Embed) {
    console.log(config);
    for (const i in config) {
      if (config[i].split("|").contains(seq.ext)) {
        await copy(
          join(basePath, seq.path),
          join(join(assetsDire, i), seq.name)
        );
      }
      const temp = outputStaticFolder.split("/");
      temp.push(i);
      return `{{<figure src="${join(
        "/",
        join(temp.slice(1).join("/"), seq.name)
      )}" title="${seq.display}">}}`;
    }
  }
  return seq.raw;
}
