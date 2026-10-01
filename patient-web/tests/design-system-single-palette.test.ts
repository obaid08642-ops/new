import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 12.A0 — "changing a token must change every screen at once".
 *
 * The review of A1/A2/A5/A6 found that this was not true, and the reason was
 * mechanical: `patient-web/app/globals.css` carried FIVE `:root` blocks
 * redefining the same variable names with different values. `--brand` was
 * declared five times — lime, cyan, mint, lime, and one more — and none of them
 * was the owner-approved Noon Dot coral. Cascade order, not a decision, was
 * picking the brand.
 *
 * No amount of token work fixes that. So this is a test, not a review comment: a
 * stylesheet may declare a custom property in exactly ONE place, and the only
 * legitimate second declaration is a theme override, which must be written as
 * such and must not introduce a literal colour.
 */

interface RootBlock {
  selector: string;
  names: string[];
  literals: string[];
}

/**
 * A balanced-brace scan, not a regular expression.
 *
 * The first version used `/([^{}]+)\{([^{}]*)\}/g` and silently found ZERO
 * blocks in a file that has two — which is the worst possible failure for a
 * guard: it passes because it is looking at nothing. A brace counter cannot be
 * fooled that way, and CSS is a nesting language, so nesting is what it does.
 */
function rootBlocks(css: string): RootBlock[] {
  const out: RootBlock[] = [];
  let depth = 0;
  let start = -1;
  let selector = "";
  const stack: number[] = [];

  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];

    if (ch === "{") {
      if (depth === 0) {
        start = i;
        selector = css.slice(stack.pop() ?? 0, i).trim();
        // A selector is whatever followed the previous block, minus comments.
        selector = selector.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      }
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const body = css.slice(start + 1, i);
        if (selector.split(",").some((part) => part.trim().startsWith(":root"))) {
          out.push({
            selector,
            names: [...body.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((x) => x[1]),
            // A var() reference is the system working; a literal is a second
            // palette hiding inside a theme block.
            literals: [...body.matchAll(/--[a-z0-9-]+\s*:\s*([^;]*)/g)]
              .filter((x) => /#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(/.test(x[1]))
              .map((x) => x[0].trim().slice(0, 60)),
          });
        }
        start = -1;
      }
      if (depth >= 0) stack.push(i + 1);
      continue;
    }
  }

  return out;
}

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const blocks = rootBlocks(css);

/** A selector that is a THEME override: it is allowed to redeclare, and it must
 *  be paired with the base so both are present. */
const isThemeOverride = (s: string) =>
  s.includes('data-theme="dark"') || s.includes("html.dark") || s.split(",").some((x) => x.trim() === ".dark");

const base = blocks.filter((b) => !isThemeOverride(b.selector));
const overrides = blocks.filter((b) => isThemeOverride(b.selector));

describe("12.A0 — one palette, declared once", () => {
  it("there is a base :root and at most one theme override", () => {
    expect(base.length).toBeGreaterThan(0);
    expect(overrides.length).toBeLessThanOrEqual(1);
  });

  it("no custom property is declared in more than the base plus its override", () => {
    const counts = new Map<string, number>();
    for (const b of blocks) for (const n of b.names) counts.set(n, (counts.get(n) ?? 0) + 1);

    // A property may appear in the base and in the dark override — that is what
    // a theme is. Three declarations is a palette nobody chose.
    const declaredTooOften = [...counts].filter(([, c]) => c > base.length + overrides.length).map(([n]) => n);
    expect(
      declaredTooOften,
      `these are declared more than once outside a theme override: ${declaredTooOften.join(", ")}`,
    ).toEqual([]);
  });

  it("no :root block carries a literal colour", () => {
    // The base points at tokens; the override points at the SAME tokens and lets
    // the dark values come from tokens.css. A literal in either place is a second
    // palette, which is the exact defect being guarded.
    for (const b of blocks) {
      expect(b.literals, `${b.selector} has a literal colour: ${b.literals.join(" | ")}`).toEqual([]);
    }
  });

  it("--brand is the Noon Dot coral, in both themes", () => {
    // The whole point of removing the five palettes: the brand is the
    // owner-approved coral, resolved from the token, and there is exactly one
    // place that says so.
    const values = [...css.matchAll(/--brand\s*:\s*([^;]+)/g)].map((m) => m[1].trim());
    expect(values.length, "expected one --brand per theme block").toBeGreaterThan(0);
    for (const v of values) {
      expect(v, `--brand is "${v}", not the Noon Dot token`).toBe("var(--nabd-color-brand-coral)");
    }
  });

  it("the file loads the generated tokens, or every var() in it resolves to nothing", () => {
    // A stylesheet full of var(--nabd-*) that never imports tokens.css is a
    // stylesheet with no colours at all — a failure that looks like a design.
    const importsTokens =
      /@import[^;]*tokens\.css/.test(css) ||
      /@nabd\/design-tokens/.test(css) ||
      /tokens\.css/.test(css);
    const usesNabdVars = /var\(--nabd-/.test(css);
    if (usesNabdVars) {
      expect(importsTokens, "globals.css uses --nabd-* but never loads tokens.css").toBe(true);
    }
  });
});

describe("12.A0 — the dark theme is the same names, not a second palette", () => {
  it("the override redeclares the same names as the base", () => {
    for (const o of overrides) {
      const missing = base.flatMap((b) => b.names).filter((n) => !o.names.includes(n));
      // Names the base defines but the override does not would fall back to the
      // LIGHT value inside a dark theme, which is a contrast bug waiting to ship.
      expect(missing, `the dark override does not redeclare: ${missing.join(", ")}`).toEqual([]);
    }
  });

  it("dark is not pure black — it is the ink canvas", () => {
    const tokens = JSON.parse(
      readFileSync(resolve(process.cwd(), "../packages/design-tokens/tokens.json"), "utf8"),
    );
    // A3 states it: "Dark is not pure black: ink canvas #0B1B2B".
    expect(tokens.color.bg.canvas.dark).toBe("#0B1B2B");
    expect(tokens.color.bg.canvas.dark.toLowerCase()).not.toBe("#000000");
  });
});
