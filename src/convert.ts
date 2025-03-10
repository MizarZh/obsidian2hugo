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

enum blockType {
  Raw,
  Link,
  Embed,
  Math,
}

interface Seq {
  raw: string;
  name: string;
  display: string;
  ext: string;
  type: blockType;
  path: string;
  relativePath: string;
  start: number;
  end: number;
}

export function export2hugo(app: App, settings: Settings) {
  const { exposeFolder, staticConfig, blogRoot, outputPostFolder } = settings;
  // fetch all the files
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

  // find all the .md files
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
    console.log(metadata);
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
    const finalLinkText = multiSplitText.join("");

    // if you don't want to contaminate obsidian tags, use ___tags instead.
    const finalTextSplit = multiSplit(finalLinkText, [
      0,
      metadata.frontmatterPosition.end.offset,
    ]);
    finalTextSplit[0] = finalTextSplit[0].replace(
      `\n${settings.tagAlternativeName}:`,
      "\ntags:"
    );
    const finalText = finalTextSplit.join("");

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
  // https://docs.obsidian.md/Reference/TypeScript+API/CachedMetadata
  const { exposeFolder } = settings;
  const links = metadata?.links;
  const embeds = metadata?.embeds;
  const sections = metadata?.sections;

  if (links !== undefined) {
    for (let i = 0; i < links.length; i++) {
      // get relative path
      const file = this.app.metadataCache.getFirstLinkpathDest(
        links[i].link,
        exposeFolder
      );

      genLinkSeq(file, links[i], settings, blockType.Link, seqArray, rawText);
    }
  }
  if (embeds !== undefined) {
    for (let i = 0; i < embeds.length; i++) {
      const file = this.app.metadataCache.getFirstLinkpathDest(
        embeds[i].link,
        exposeFolder
      );
      genLinkSeq(file, embeds[i], settings, blockType.Embed, seqArray, rawText);
    }
  }
  if (sections !== undefined) {
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].type === "math") {
        const mathSection = sections[i];
        const obsLink = rawText.slice(
          mathSection.position.start.offset,
          mathSection.position.end.offset
        );
        seqArray.push({
          raw: obsLink,
          name: "",
          display: "",
          ext: "",
          type: blockType.Math,
          path: "",
          relativePath: "",
          start: mathSection.position.start.offset,
          end: mathSection.position.end.offset,
        });
      }
    }
  }
}

function genLinkSeq(
  file: TFile,
  link: ReferenceCache,
  settings: Settings,
  type: blockType,
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
  if (seq.type === blockType.Link) {
    return `[${seq.display}]({{<ref "${seq.relativePath}">}})`;
  } else if (seq.type === blockType.Embed) {
    console.log(config);
    for (const i in config) {
      if (config[i].split("|").contains(seq.ext)) {
        // ! move copy to seq
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
  else if(seq.type === blockType.Math) {
    return `{{<raw>}}\n${seq.raw}\n{{</raw>}}`
  }
  return seq.raw;
}
