import fs from "node:fs";
import path from "node:path";
import { createRule } from "../create-rule.ts";

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

const scriptExtension = /\.(?:tsx?|jsx?)$/;
const nonModuleFile = /\.(?:test|spec|gen|generated)\.|\.d\.tsx?$/;
const allDirections: Direction[] = ["prefix", "suffix"];
const hookMarker = /^use(?=[A-Z])/;

export const leakedNamespace = createRule<Options, "leakedNamespace">({
  name: "leaked-namespace",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow sibling files that repeat a filename prefix or suffix; promote it to a directory.",
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
      leakedNamespace:
        "Files [{{members}}] repeat {{direction}} '{{token}}'. Group them under a directory named '{{directory}}'.",
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

    const siblings = siblingsOf(path.dirname(filename), isModule);
    const clusters = directions
      .map((direction) => clusterOf(basename, siblings, direction))
      .filter((cluster): cluster is Cluster => cluster !== null)
      .filter(
        ({ token, members }) => token.length >= minTokenLength && members.length >= minClusterSize,
      );

    return {
      Program(node) {
        for (const { direction, token, members } of clusters) {
          context.report({
            node,
            messageId: "leakedNamespace",
            data: {
              direction,
              token,
              members: members.join(", "),
              directory: directoryFor(direction, token),
            },
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
  for (let end = matching; end >= 0; end--) {
    if (aBoundaries.has(end) && bBoundaries.has(end)) return a.slice(0, end).replace(/_$/, "");
    if (end === a.length || end === b.length) return a.slice(0, end);
  }

  return "";
}

function sharedSuffix(a: string, b: string) {
  const matching = matchingLength(a, b, (index, text) => text.length - index - 1);
  const aBoundaries = tokenBoundaries(a);
  const bBoundaries = tokenBoundaries(b);
  for (let size = matching; size > 0; size--) {
    if (aBoundaries.has(a.length - size) && bBoundaries.has(b.length - size)) {
      return a.slice(a.length - size);
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
    if (/[A-Z]/.test(name[index] ?? "") || name[index - 1] === "_") boundaries.add(index);
  }

  return boundaries;
}

function directoryFor(direction: Direction, token: string) {
  if (direction === "prefix") return token;

  return token.charAt(0).toLowerCase() + token.slice(1);
}
