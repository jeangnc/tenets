import { destructureDotAccess } from "./rules/destructure-dot-access.ts";
import { destructureJsxDotAccess } from "./rules/destructure-jsx-dot-access.ts";
import { featureEnvy } from "./rules/feature-envy.ts";
import { folderConventions } from "./rules/folder-conventions.ts";
import { fileStutter } from "./rules/file-stutter.ts";
import { noDirectIntlFormat } from "./rules/no-direct-intl-format.ts";
import { noDuplicateClassString } from "./rules/no-duplicate-class-string.ts";
import { noFlashlistEmptyComponent } from "./rules/no-flashlist-empty-component.ts";
import { noImportantTailwind } from "./rules/no-important-tailwind.ts";
import { noRenderProp } from "./rules/no-render-prop.ts";
import { noTailwindSpaceBetween } from "./rules/no-tailwind-space-between.ts";
import { relativeFeatureImports } from "./rules/relative-feature-imports.ts";

export const rules = {
  "destructure-dot-access": destructureDotAccess,
  "destructure-jsx-dot-access": destructureJsxDotAccess,
  "feature-envy": featureEnvy,
  "folder-conventions": folderConventions,
  "file-stutter": fileStutter,
  "no-direct-intl-format": noDirectIntlFormat,
  "no-duplicate-class-string": noDuplicateClassString,
  "no-flashlist-empty-component": noFlashlistEmptyComponent,
  "no-important-tailwind": noImportantTailwind,
  "no-render-prop": noRenderProp,
  "no-tailwind-space-between": noTailwindSpaceBetween,
  "relative-feature-imports": relativeFeatureImports,
};

export type RuleName = keyof typeof rules;
