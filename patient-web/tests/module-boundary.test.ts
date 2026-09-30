import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * patient-web cannot import from `packages/`.
 *
 * This is not a preference, and it was learned the expensive way. A6's
 * `IllustratedIconView` exists in `packages/ui` and the home page's eight
 * service tiles were rewritten to use it. `tsc --noEmit` passed, because
 * TypeScript follows the `link:` dependency and the import-map alias. Then
 * `next build` failed:
 *
 *     Module not found: Can't resolve '@nabd/ui'
 *     Import map: aliased to relative '../packages/ui/src/index.ts' inside of
 *     [project]/
 *
 * Turbopack refuses to resolve outside the app root, and the alias does not
 * help: it resolves, and the target is still outside the project. It is the
 * same wall `tools/design/sync-token-css.mjs` documents for CSS, which is why
 * the token sheets are mirrored into `app/design-tokens/` and generated rather
 * than imported.
 *
 * So the rule is: patient-web gets shared design-system VALUES through a
 * generated mirror, and shared React COMPONENTS have to be mirrored the same
 * way. Until that mirror exists, nothing here may import `@nabd/*`.
 */
const APP = resolve(process.cwd());
const SKIP = new Set(["node_modules", ".next", "dist", "build", "coverage", ".expo"]);

/**
 * Only SHIPPED code is checked. `tests/` may import the workspace packages and
 * does: the A7 component-contract test is the thing that keeps `@nabd/ui` and
 * `@nabd/ui-native` honest, and vitest resolves `link:` dependencies normally.
 * The build never sees a test file — Turbopack only compiles `app/` and the
 * components Next pulls in from it — so a package import in a test is fine and
 * one in a screen is a build break.
 */
const SHIPPED = ["app", "components-next", "lib", "components"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

describe("patient-web module boundary", () => {
  const roots = SHIPPED.filter((d) => existsSync(join(APP, d)));
  const files = roots.flatMap((d) => walk(join(APP, d)));

  it("imports nothing from the workspace packages", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/from\s+"(@nabd\/[^"]+)"/g)) {
        offenders.push(`${file.replace(APP + "/", "")} -> ${m[1]}`);
      }
    }
    // A shared design-system component needs a generated mirror, the same way
    // app/design-tokens/ is one. Until then this is a build break, not a smell:
    // the type checker will not catch it.
    expect(offenders, `these will break \`next build\`: \n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  it("actually scans the shipped code, not nothing", () => {
    // A boundary test that walks an empty list passes forever.
    expect(files.length).toBeGreaterThan(50);
  });

  it("reads the token values from the generated mirror, not the package", () => {
    const globals = readFileSync(join(APP, "app/globals.css"), "utf8");
    expect(globals).toContain('@import "./design-tokens/tokens.css"');
    expect(globals).toContain('@import "./design-tokens/fonts.css"');
    // The mirror is generated and checked, so it cannot drift.
    expect(globals).not.toMatch(/@import\s+["'][^"']*packages\//);
  });
});
