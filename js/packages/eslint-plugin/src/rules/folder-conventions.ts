import { createRule } from "../create-rule.ts";

const PATH_SEPARATOR = /[\\/]/;
const TEST_FILE = /\.(?:test|spec|testkit)\.[jt]sx?$/;
const VIRTUAL_FILENAMES = new Set(["", "<input>", "<text>"]);
const FALLBACK_MESSAGE = "Basename `{{basename}}` violates folder convention.";

type Convention = { folder: string; allow?: string; deny?: string; message?: string };
type Options = [Convention[]];

const REACT_HOOK_CONVENTIONS: Convention[] = [
  {
    folder: "components",
    deny: "^use[A-Z][A-Za-z0-9]*\\.(ts|tsx)$",
    message:
      "Hook file `{{basename}}` lives under `components/`. Move to a sibling `hooks/` directory.",
  },
  {
    folder: "hooks",
    allow: "^(use[A-Z][A-Za-z0-9]*|index)\\.(ts|tsx)$",
    message:
      "Non-hook file `{{basename}}` lives under `hooks/`. Move helpers/types to the owning concept or lift into the hook that uses them.",
  },
];

export const folderConventions = createRule<Options, "violation">({
  name: "folder-conventions",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce per-folder basename naming conventions (e.g. only `useFoo.ts` may live under `hooks/`).",
    },
    schema: [
      {
        type: "array",
        items: {
          type: "object",
          properties: {
            folder: { type: "string", minLength: 1 },
            allow: { type: "string", minLength: 1 },
            deny: { type: "string", minLength: 1 },
            message: { type: "string", minLength: 1 },
          },
          required: ["folder"],
          anyOf: [
            { type: "object", required: ["allow"] },
            { type: "object", required: ["deny"] },
          ],
          additionalProperties: false,
        },
      },
    ],
    messages: { violation: "{{message}}" },
  },
  defaultOptions: [REACT_HOOK_CONVENTIONS],
  create(context, [conventions]) {
    const filename = context.filename;
    if (VIRTUAL_FILENAMES.has(filename)) return {};
    const segments = filename.split(PATH_SEPARATOR);
    const basename = segments.at(-1) ?? filename;
    if (TEST_FILE.test(basename)) return {};
    const violated = violatedConvention(conventions, segments, basename);
    if (violated === undefined) return {};

    return {
      Program(node) {
        const message = (violated.message ?? FALLBACK_MESSAGE)
          .replaceAll("{{basename}}", basename)
          .replaceAll("{{folder}}", violated.folder);
        context.report({ node, messageId: "violation", data: { message } });
      },
    };
  },
});

function violatedConvention(
  conventions: Convention[],
  segments: string[],
  basename: string,
): Convention | undefined {
  const nearestFolder = segments
    .toReversed()
    .find((segment) => conventions.some((convention) => convention.folder === segment));
  return conventions.find(
    (convention) => convention.folder === nearestFolder && isViolatedBy(convention, basename),
  );
}

function isViolatedBy(convention: Convention, basename: string): boolean {
  if (convention.deny !== undefined && new RegExp(convention.deny).test(basename)) return true;
  return convention.allow !== undefined && !new RegExp(convention.allow).test(basename);
}
