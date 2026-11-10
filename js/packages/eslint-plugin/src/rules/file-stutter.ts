import fs from "node:fs";
import path from "node:path";
import { createRule } from "../create-rule.ts";
import { groupingFolders } from "../grouping-folders.ts";

type Direction = "prefix" | "suffix";

type Options = [
  {
    directions?: Direction[];
    minTokenLength?: number;
    minClusterSize?: number;
    ignore?: string[];
  },
];

type Cluster = { direction: Direction; token: string; members: string[] };

type Siblings = { files: string[]; directories: Set<string> };

type Advice =
  | { messageId: "fileStutter"; target: string }
  | { messageId: "namesNamespace"; directory: string }
  | { messageId: "namesNamespaceInGroupingFolder"; directory: string; target: string };

const scriptExtension = /\.(?:tsx?|jsx?)$/;
const componentExtension = /\.[jt]sx$/;
const nonModuleFile = /\.(?:test|spec|gen|generated)\.|\.d\.tsx?$/;
const allDirections: Direction[] = ["prefix", "suffix"];
const hookMarker = /^use(?=[A-Z])/;
const clusterText = "Files [{{members}}] repeat {{direction}} '{{token}}'";

export const fileStutter = createRule<Options, Advice["messageId"]>({
  name: "file-stutter",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow sibling files that repeat a filename prefix or suffix; promote it to a concept folder.",
    },
    schema: [
      {
        type: "object",
        properties: {
          directions: {
            type: "array",
            items: { type: "string", enum: allDirections },
            minItems: 1,
            uniqueItems: true,
          },
          minTokenLength: { type: "integer", minimum: 1 },
          minClusterSize: { type: "integer", minimum: 2 },
          ignore: { type: "array", items: { type: "string" }, uniqueItems: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      fileStutter: `${clusterText}. Move this file to '{{target}}'.`,
      namesNamespace: `${clusterText}, which this file is named after. Move the others under '{{directory}}'.`,
      namesNamespaceInGroupingFolder: `${clusterText}, which this file is named after. Move this file to '{{target}}' and the others under '{{directory}}'.`,
    },
  },
  defaultOptions: [{ directions: allDirections, minTokenLength: 3, minClusterSize: 2, ignore: [] }],
  create(
    context,
    [{ directions = allDirections, minTokenLength = 3, minClusterSize = 2, ignore = [] }],
  ) {
    const { filename } = context;
    if (!path.isAbsolute(filename)) return {};

    const ignored = ignore.map((source) => new RegExp(source));
    const isModule = (name: string) =>
      scriptExtension.test(name) &&
      stem(name) !== "index" &&
      !nonModuleFile.test(name) &&
      !ignored.some((pattern) => pattern.test(name));

    const basename = path.basename(filename);
    if (!isModule(basename)) return {};

    const directory = path.dirname(filename);
    const siblings = siblingsOf(directory, isModule);
    const clusters = directions
      .map((direction) => clusterOf(basename, siblings, direction))
      .filter((cluster): cluster is Cluster => cluster !== null)
      .filter(
        ({ token, members }) => token.length >= minTokenLength && members.length >= minClusterSize,
      );
    const role = path.basename(directory);

    return {
      Program(node) {
        for (const cluster of clusters) {
          const { messageId, ...destination } = adviceFor(basename, cluster, role);
          const { direction, token, members } = cluster;
          context.report({
            node,
            messageId,
            data: { direction, token, members: members.join(", "), ...destination },
          });
        }
      },
    };
  },
});

function stem(name: string) {
  return name.replace(scriptExtension, "");
}

function namespaceStem(name: string) {
  return stem(name).replace(hookMarker, "");
}

function siblingsOf(directory: string, isModule: (name: string) => boolean): Siblings {
  const entries = readEntries(directory);

  return {
    files: entries
      .filter((entry) => entry.isFile() && isModule(entry.name))
      .map(({ name }) => name)
      .toSorted(),
    directories: new Set(entries.filter((entry) => entry.isDirectory()).map(({ name }) => name)),
  };
}

function readEntries(directory: string) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function clusterOf(basename: string, siblings: Siblings, direction: Direction): Cluster | null {
  const shared = direction === "prefix" ? sharedPrefix : sharedSuffix;
  const name = namespaceStem(basename);
  const tokenWith = (sibling: string) => shared(name, namespaceStem(sibling));
  const token = siblings.files
    .filter((sibling) => sibling !== basename)
    .map(tokenWith)
    .reduce((longest, candidate) => (candidate.length > longest.length ? candidate : longest), "");
  if (token === "") return null;
  if (direction === "prefix" && siblings.directories.has(token)) return null;

  const members = siblings.files.filter(
    (sibling) => sibling === basename || tokenWith(sibling) === token,
  );

  return { direction, token, members };
}

function sharedPrefix(a: string, b: string) {
  const matching = matchingLength(a, b, (index) => index);
  const aBoundaries = tokenBoundaries(a);
  const bBoundaries = tokenBoundaries(b);
  for (let end = matching; end > 0; end--) {
    if (aBoundaries.has(end) && bBoundaries.has(end)) return a.slice(0, end).replace(/_$/, "");
  }

  return "";
}

function sharedSuffix(a: string, b: string) {
  const matching = matchingLength(a, b, (index, text) => text.length - index - 1);
  const aBoundaries = tokenBoundaries(a);
  const bBoundaries = tokenBoundaries(b);
  for (let size = matching; size > 0; size--) {
    if (aBoundaries.has(a.length - size) && bBoundaries.has(b.length - size)) {
      return a.slice(a.length - size).replace(/^_/, "");
    }
  }

  return "";
}

function matchingLength(a: string, b: string, position: (index: number, text: string) => number) {
  const limit = Math.min(a.length, b.length);
  let length = 0;
  while (length < limit && a[position(length, a)] === b[position(length, b)]) length++;

  return length;
}

function tokenBoundaries(name: string) {
  const boundaries = new Set([0, name.length]);
  for (let index = 0; index < name.length; index++) {
    if (/[A-Z_]/.test(name[index] ?? "") || name[index - 1] === "_") boundaries.add(index);
  }

  return boundaries;
}

function adviceFor(basename: string, { direction, token, members }: Cluster, role: string): Advice {
  const isInGroupingFolder = groupingFolders.has(role);
  const hoist = isInGroupingFolder ? "../" : "";
  const owned = members.some((member) => isOwner(member, token));
  const concept = owned ? token : lowerFirst(token);
  const directory = role === "hooks" ? `${hoist}${concept}/hooks/` : `${hoist}${concept}/`;
  const leaf = leafOf(basename, direction, token);

  if (leaf !== null) return { messageId: "fileStutter", target: `${directory}${leaf}` };
  if (!isInGroupingFolder) return { messageId: "namesNamespace", directory };

  const target = role === "hooks" ? `${directory}${basename}` : `${hoist}${basename}`;

  return { messageId: "namesNamespaceInGroupingFolder", directory, target };
}

function isOwner(member: string, token: string) {
  return componentExtension.test(member) && stem(member) === token;
}

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function leafOf(basename: string, direction: Direction, token: string) {
  const name = namespaceStem(basename);
  const rest =
    direction === "prefix"
      ? name.slice(token.length).replace(/^_/, "")
      : name.slice(0, name.length - token.length).replace(/_$/, "");
  if (rest === "") return null;

  const extension = basename.slice(stem(basename).length);
  if (hookMarker.test(stem(basename))) return `use${upperFirst(rest)}${extension}`;
  const leaf = /[a-z]/.test(name.charAt(0)) ? lowerFirst(rest) : upperFirst(rest);

  return `${leaf}${extension}`;
}

function upperFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
