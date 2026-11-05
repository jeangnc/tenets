import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { groupingFolders } from "../grouping-folders.ts";
import type { Graph } from "./graph.ts";
import { isInside } from "./paths.ts";
import { isTest, type Tree } from "./tree.ts";

export type Misplacement = { file: string; home: string };

export type Policy = { exempt: RegExp[]; routerRoots: string[] };

type Unit = {
  file: string;
  isHook: boolean;
  directory: string;
  owned: string | null;
  faces: string[];
};

type Placement = { home: string; accepted: string[] };

const hookFile = /^use[A-Z]\w*\.tsx?$/;
const componentFile = /^(?:[A-Z]\w*|index)\.tsx$/;
const indexFiles = ["index.ts", "index.tsx"];

export function misplacementsOf(tree: Tree, graph: Graph, policy: Policy): Misplacement[] {
  return tree.files
    .filter((file) => isSubject(tree, file))
    .map((file) => misplacementOf(tree, graph, policy, file))
    .filter((misplacement) => misplacement !== null);
}

function isSubject(tree: Tree, file: string): boolean {
  if (!isInside(file, tree.root) || isTest(tree, file)) return false;
  const name = basename(file);

  return hookFile.test(name) || componentFile.test(name);
}

function misplacementOf(
  tree: Tree,
  graph: Graph,
  policy: Policy,
  file: string,
): Misplacement | null {
  const unit = unitOf(tree, file);
  if (isExempt(tree, policy, unit)) return null;
  if (isPublished(graph, unit)) return null;

  const consumers = consumersOf(tree, graph, unit);
  if (consumers.length === 0 || isFlat(tree, unit, consumers)) return null;

  const placement = placementOf(tree, unit, consumers);
  if (placement.accepted.includes(unit.directory)) return null;
  if (!isTooHigh(unit, placement) && !isLeaking(tree, unit, placement)) return null;
  if (policy.routerRoots.some((root) => isInside(placement.home, root))) return null;
  if (importsPrivateFiles(tree, graph, unit, placement.home)) return null;

  return { file: tree.relativeOf(file), home: tree.relativeOf(placement.home) };
}

function unitOf(tree: Tree, file: string): Unit {
  const name = withoutExtension(file);
  const folder = dirname(file);
  if (hookFile.test(basename(file)))
    return { file, isHook: true, directory: folder, owned: null, faces: [file] };

  const isFace = name === "index" || basename(folder) === name;
  const owned = isFace ? folder : join(folder, name);
  const faces = [
    file,
    ...indexFiles.map((index) => join(owned, index)).filter((index) => tree.known.has(index)),
  ];

  return {
    file,
    isHook: false,
    directory: isFace ? dirname(folder) : folder,
    owned,
    faces: [...new Set(faces)],
  };
}

function withoutExtension(file: string): string {
  return basename(file).replace(/\.tsx?$/, "");
}

function isExempt(tree: Tree, policy: Policy, unit: Unit): boolean {
  const path = tree.relativeOf(unit.file);

  return (
    policy.exempt.some((pattern) => pattern.test(path)) ||
    policy.routerRoots.some((root) => isInside(unit.directory, root))
  );
}

function isPublished(graph: Graph, unit: Unit): boolean {
  return unit.faces.some((face) =>
    [...(graph.publishers.get(face) ?? [])].some(
      (barrel) => !unit.faces.includes(barrel) || isPublished(graph, { ...unit, faces: [barrel] }),
    ),
  );
}

function consumersOf(tree: Tree, graph: Graph, unit: Unit): string[] {
  const consumers = unit.faces.flatMap((face) => [...(graph.consumers.get(face) ?? [])]);

  return [...new Set(consumers)].filter(
    (consumer) =>
      !unit.faces.includes(consumer) &&
      !isTest(tree, consumer) &&
      !(unit.owned && isInside(consumer, unit.owned)),
  );
}

function isFlat(tree: Tree, unit: Unit, consumers: string[]): boolean {
  const [consumer] = consumers;
  if (consumers.length !== 1 || consumer === undefined) return false;
  const owned = ownedDirectoryOf(tree, consumer);

  return (
    dirname(consumer) === unit.directory && owned !== dirname(consumer) && !hasFiles(tree, owned)
  );
}

function placementOf(tree: Tree, unit: Unit, consumers: string[]): Placement {
  const ancestor = commonAncestor(consumers.map((consumer) => ownedDirectoryOf(tree, consumer)));
  if (isComponentDirectory(tree, ancestor)) {
    const home = unit.isHook ? join(ancestor, "hooks") : ancestor;
    return { home, accepted: [home] };
  }

  const grouping = withoutGrouping(ancestor);
  const nested = join(grouping, unit.isHook ? "hooks" : "components");
  const home = unit.isHook || hasFiles(tree, nested) ? nested : grouping;
  return { home, accepted: [grouping, nested] };
}

function isTooHigh(unit: Unit, placement: Placement): boolean {
  return isInside(placement.home, withoutGrouping(unit.directory));
}

function isLeaking(tree: Tree, unit: Unit, placement: Placement): boolean {
  const owner = governingComponentOf(tree, unit.directory);

  return owner !== null && !isInside(placement.home, owner);
}

function ownedDirectoryOf(tree: Tree, consumer: string): string {
  const name = withoutExtension(consumer);
  const folder = dirname(consumer);
  if (componentFile.test(basename(consumer))) {
    return name === "index" || basename(folder) === name ? folder : join(folder, name);
  }

  return governingDirectory(tree, folder);
}

function governingDirectory(tree: Tree, folder: string): string {
  return governingComponentOf(tree, folder) ?? withoutGrouping(folder);
}

function governingComponentOf(tree: Tree, folder: string): string | null {
  for (
    let current = folder;
    isInside(current, tree.root) && current !== tree.root;
    current = dirname(current)
  ) {
    if (isComponentDirectory(tree, current)) return current;
  }
  return null;
}

function isComponentDirectory(tree: Tree, folder: string): boolean {
  const name = basename(folder);

  return [`${folder}.tsx`, join(folder, `${name}.tsx`), join(folder, "index.tsx")].some((file) =>
    tree.known.has(file),
  );
}

function withoutGrouping(folder: string): string {
  return groupingFolders.has(basename(folder)) ? dirname(folder) : folder;
}

function commonAncestor(folders: string[]): string {
  return folders.reduce((ancestor, folder) => {
    let shared = ancestor;
    while (!isInside(folder, shared)) shared = dirname(shared);
    return shared;
  });
}

function importsPrivateFiles(tree: Tree, graph: Graph, unit: Unit, home: string): boolean {
  return [...(graph.imports.get(unit.file) ?? [])].some((target) => {
    if (unit.owned && isInside(target, unit.owned)) return false;
    const owner = privacyOwnerOf(tree, target);

    return owner !== null && isInside(unit.directory, owner) && !isInside(home, owner);
  });
}

function privacyOwnerOf(tree: Tree, target: string): string | null {
  const name = withoutExtension(target);
  const folder = dirname(target);
  const start = name === "index" || basename(folder) === name ? dirname(folder) : folder;

  return governingComponentOf(tree, start);
}

function hasFiles(tree: Tree, folder: string): boolean {
  return existsSync(folder) && tree.files.some((file) => isInside(file, folder));
}
