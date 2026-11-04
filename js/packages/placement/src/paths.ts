import { sep } from "node:path";

export function isInside(path: string, folder: string): boolean {
  return path === folder || path.startsWith(folder + sep);
}
