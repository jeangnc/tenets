import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPlacement, findMisplacements, type Options } from "./index.ts";

const tsconfig = JSON.stringify({
  compilerOptions: { jsx: "preserve", module: "ESNext", moduleResolution: "Bundler" },
  include: ["**/*.ts", "**/*.tsx", "../outside/**/*.ts"],
});

type Sources = Record<string, string>;
type Policy = Omit<Options, "tsconfig">;

const roots: string[] = [];

afterEach(() => {
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function project(files: Sources): string {
  const root = mkdtempSync(join(tmpdir(), "nearest-owner-"));
  roots.push(root);
  Object.entries({ "app/tsconfig.json": tsconfig, ...files }).forEach(([path, source]) => {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, source);
  });

  return join(root, "app/tsconfig.json");
}

function misplacements(files: Sources, policy: Policy = {}) {
  return findMisplacements(ts, { tsconfig: project(files), ...policy });
}

function exporting(name: string, ...imports: string[]): string {
  const lines = imports.map((specifier, index) => `import { value${index} } from "${specifier}";`);
  return [...lines, `export const ${name} = () => null;`].join("\n");
}

const page: Sources = {
  "app/src/a/Page.tsx": exporting("Page", "./Page/Body"),
  "app/src/a/Page/Body.tsx": exporting("Body"),
};

const misplacedHeader: Sources = {
  ...page,
  "app/src/a/Page.tsx": exporting("Page", "./Page/Body", "./Header"),
  "app/src/a/Header.tsx": exporting("Header"),
};

describe("findMisplacements", { timeout: 30_000 }, () => {
  it("reports a component whose single consumer owns a folder", () => {
    expect(misplacements(misplacedHeader)).toEqual([
      { file: "src/a/Header.tsx", home: "src/a/Page" },
    ]);
  });

  it("keeps a component beside a single consumer that owns no folder", () => {
    expect(
      misplacements({
        "app/src/a/Page.tsx": exporting("Page", "./Header"),
        "app/src/a/Header.tsx": exporting("Header"),
      }),
    ).toEqual([]);
  });

  it("treats a component named after its folder as that folder's owner", () => {
    expect(
      misplacements({
        "app/src/a/Page/Page.tsx": exporting("Page", "./Body", "../Header"),
        "app/src/a/Page/Body.tsx": exporting("Body"),
        "app/src/a/Header.tsx": exporting("Header"),
      }),
    ).toEqual([{ file: "src/a/Header.tsx", home: "src/a/Page" }]);
  });

  it("reports a hook consumed only by a hook inside a component", () => {
    expect(
      misplacements({
        ...page,
        "app/src/a/Page.tsx": exporting("Page", "./Page/Body", "./Page/hooks/useOuter"),
        "app/src/a/Page/hooks/useOuter.ts": exporting("useOuter", "../../hooks/useInner"),
        "app/src/a/hooks/useInner.ts": exporting("useInner"),
      }),
    ).toEqual([{ file: "src/a/hooks/useInner.ts", home: "src/a/Page/hooks" }]);
  });

  it("reports a hook inside a component whose only consumer sits outside it", () => {
    expect(
      misplacements({
        ...page,
        "app/src/a/Page/hooks/useScroll.ts": exporting("useScroll"),
        "app/src/a/Side.tsx": exporting("Side", "./Page/hooks/useScroll"),
      }),
    ).toEqual([{ file: "src/a/Page/hooks/useScroll.ts", home: "src/a/Side/hooks" }]);
  });

  it("homes a hook in the component that contains all of its consumers", () => {
    expect(
      misplacements({
        ...page,
        "app/src/a/Page/Body.tsx": exporting("Body", "../hooks/useShared"),
        "app/src/a/Page/Footer.tsx": exporting("Footer", "../hooks/useShared"),
        "app/src/a/hooks/useShared.ts": exporting("useShared"),
      }),
    ).toEqual([{ file: "src/a/hooks/useShared.ts", home: "src/a/Page/hooks" }]);
  });

  it("reports a hook above the folder where its consumers meet", () => {
    expect(
      misplacements({
        "app/src/a/one/One.tsx": exporting("One", "../../hooks/useShared"),
        "app/src/a/two/Two.tsx": exporting("Two", "../../hooks/useShared"),
        "app/src/hooks/useShared.ts": exporting("useShared"),
      }),
    ).toEqual([{ file: "src/hooks/useShared.ts", home: "src/a/hooks" }]);
  });

  it("accepts a hook in the hooks folder where its consumers meet", () => {
    expect(
      misplacements({
        "app/src/a/one/One.tsx": exporting("One", "../hooks/useShared"),
        "app/src/a/two/Two.tsx": exporting("Two", "../hooks/useShared"),
        "app/src/a/hooks/useShared.ts": exporting("useShared"),
      }),
    ).toEqual([]);
  });

  it("traces a consumer through a re-export to the declaring file", () => {
    expect(
      misplacements({
        ...page,
        "app/src/a/Page/Body.tsx": exporting("Body", "./parts"),
        "app/src/a/Page/parts.ts": 'export { Header as value0 } from "../Header";',
        "app/src/a/Header.tsx": exporting("Header"),
      }),
    ).toEqual([{ file: "src/a/Header.tsx", home: "src/a/Page" }]);
  });

  it("keeps a component that a barrel publishes", () => {
    expect(
      misplacements({
        ...page,
        "app/src/a/Page/Body.tsx": exporting("Body", "../Header"),
        "app/src/a/Header.tsx": exporting("Header"),
        "app/src/a/index.ts": 'import { Header } from "./Header";\nexport const A = { Header };',
      }),
    ).toEqual([]);
  });

  it("ignores test consumers", () => {
    expect(
      misplacements({
        ...misplacedHeader,
        "app/src/b/Header.test.tsx": exporting("test", "../a/Header"),
      }),
    ).toEqual([{ file: "src/a/Header.tsx", home: "src/a/Page" }]);
  });

  it("counts type-only consumers", () => {
    expect(
      misplacements({
        ...page,
        "app/src/a/Page.tsx": exporting("Page", "./Page/Body", "./Header"),
        "app/src/a/Header.tsx":
          "export type Props = { title: string };\nexport const Header = () => null;",
        "app/src/b/Other.tsx":
          'import type { Props } from "../a/Header";\nexport const Other = (props: Props) => props;',
      }),
    ).toEqual([]);
  });

  it("keeps a file that matches an exempt pattern", () => {
    expect(misplacements(misplacedHeader, { exempt: [/^src\/a\/Header/] })).toEqual([]);
  });

  it("keeps a file that would import its current owner's private files", () => {
    expect(
      misplacements({
        ...page,
        "app/src/a/Page/Title.tsx": exporting("Title", "./Body"),
        "app/src/a/Side.tsx": exporting("Side", "./Side/Item", "./Page/Title"),
        "app/src/a/Side/Item.tsx": exporting("Item"),
      }),
    ).toEqual([]);
  });

  it("never homes a file under a router root", () => {
    expect(
      misplacements(
        {
          "app/src/routes/index.tsx": exporting("Route", "./index/Body", "../a/Header"),
          "app/src/routes/index/Body.tsx": exporting("Body"),
          "app/src/a/Header.tsx": exporting("Header"),
        },
        { routerRoots: ["src/routes"] },
      ),
    ).toEqual([]);
  });

  it("ignores files outside the project", () => {
    expect(
      misplacements({
        ...page,
        "app/src/a/Page/Body.tsx": exporting("Body", "../../../../outside/hooks/useShared"),
        "outside/hooks/useShared.ts": exporting("useShared"),
      }),
    ).toEqual([]);
  });

  it("keeps mobile library files and screens under the mobile router root", () => {
    expect(
      misplacements(
        {
          "app/src/app/routes/home.tsx": exporting("Home", "./home/Body", "../../features/a/Card"),
          "app/src/app/routes/home/Body.tsx": exporting("Body", "../../../../lib/ui/Button"),
          "app/src/features/a/Card.tsx": exporting("Card"),
          "app/lib/ui/Button.tsx": exporting("Button"),
        },
        { exempt: [/^lib\//], routerRoots: ["src/app/routes"] },
      ),
    ).toEqual([]);
  });
});

describe("checkPlacement", { timeout: 30_000 }, () => {
  it("prints each misplacement with the home its consumers meet under", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    checkPlacement(ts, { tsconfig: project(misplacedHeader) });

    expect(error.mock.calls).toEqual([
      [
        "src/a/Header.tsx: its consumers meet under src/a/Page/; move it there or move them under its owner",
      ],
    ]);
  });

  it("fails the process when a file is misplaced", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    checkPlacement(ts, { tsconfig: project(misplacedHeader) });

    expect(process.exitCode).toBe(1);
  });

  it("leaves the process passing when every file sits under its owner", () => {
    checkPlacement(ts, { tsconfig: project(page) });

    expect(process.exitCode).toBeUndefined();
  });
});
