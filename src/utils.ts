import { TFile } from "obsidian";
import { resolve, relative, posix } from "path";

export function trimFile(file: TFile): string {
  if (!file) return "";
  return file.extension == "md" ? file.path.slice(0, -3) : file.path;
}

export function isInPath(
  prefixPath: string,
  filePath: string | undefined
): boolean {
  if (filePath == undefined) filePath = "";
  if (prefixPath === "/") prefixPath = "";
  const relativePath = posix.relative(prefixPath, filePath);
  if (relativePath.length > 0 && relativePath.slice(0, 3) === "../")
    return false;
  return true;
}

export function getRelativePath(path1: string, path2: string) {
  return posix.relative(path1, path2);
}

export function tripleSplit(
  str: string,
  pos1: number,
  pos2: number
): Array<string> {
  const str1 = str.slice(0, pos1);
  const str2 = str.slice(pos1, pos2);
  const str3 = str.slice(pos2);
  return [str1, str2, str3];
}

export function multiSplit(str: string, pos: Array<number>): Array<string> {
  const retStr: Array<string> = [];
  for (let i = 0; i < pos.length; i++) {
    retStr.push(str.slice(pos[i], pos[i + 1]));
  }
  return retStr;
}

export function join(a: string, b: string): string {
  return posix.join(a, b);
}
