import { join, resolve } from "node:path";
import type TypeScript from "typescript";
import { graphOf } from "./graph.ts";
import { misplacementsOf, type Misplacement } from "./misplacement.ts";
import { treeOf } from "./tree.ts";

export type { Misplacement };

export type Options = {
  tsconfig: string;
  exempt?: RegExp[];
  routerRoots?: string[];
};

export function findMisplacements(
  ts: typeof TypeScript,
  { tsconfig, exempt = [], routerRoots = [] }: Options,
): Misplacement[] {
  const tree = treeOf(ts, resolve(tsconfig));
  const graph = graphOf(ts, tree);
  const policy = { exempt, routerRoots: routerRoots.map((root) => join(tree.root, root)) };

  return misplacementsOf(tree, graph, policy);
}

export function checkPlacement(ts: typeof TypeScript, options: Options): void {
  const misplacements = findMisplacements(ts, options);
  for (const { file, home } of misplacements) {
    console.error(
      `${file}: its consumers meet under ${home}/; move it there or move them under its owner`,
    );
  }
  if (misplacements.length > 0) process.exitCode = 1;
}
