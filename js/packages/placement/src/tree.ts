import { dirname, relative, resolve, sep } from "node:path";
import type TypeScript from "typescript";

export type Tree = {
  root: string;
  files: string[];
  known: Set<string>;
  options: TypeScript.CompilerOptions;
  host: TypeScript.CompilerHost;
  relativeOf: (file: string) => string;
};

const excludedSource =
  /(?:^|\/)(?:__tests__|__generated__|generated|node_modules)\/|\.(?:test|spec|testkit|gen|generated)\.[cm]?[jt]sx?$|\.d\.ts$/;
const testSource = /(?:^|\/)test-setup\.[cm]?[jt]sx?$/;
const generatedSource = /\.gen\.[jt]sx?$|\.d\.ts$/;

export function treeOf(ts: typeof TypeScript, tsconfig: string): Tree {
  const root = dirname(tsconfig);
  const config = ts.readConfigFile(tsconfig, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const files = parsed.fileNames
    .map((file) => resolve(file))
    .filter((file) => /\.tsx?$/.test(file) && !generatedSource.test(file));

  return {
    root,
    files,
    known: new Set(files),
    options: parsed.options,
    host: ts.createCompilerHost(parsed.options),
    relativeOf: (file) => relative(root, file).split(sep).join("/"),
  };
}

export function isTest(tree: Tree, file: string): boolean {
  const path = tree.relativeOf(file);

  return excludedSource.test(path) || testSource.test(path);
}
