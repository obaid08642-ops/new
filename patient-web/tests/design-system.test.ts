import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const tokens = readFileSync(resolve(process.cwd(), "app/design-tokens/tokens.css"), "utf8");
const fonts = readFileSync(resolve(process.cwd(), "app/design-tokens/fonts.css"), "utf8");

/** Strip /* *\/ comments so prose about vars is not mistaken for real usage. */
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

describe("patient design system", () => {
  it("imports the generated token sheets rather than declaring a palette", () => {
    expect(css).toContain('@import "./design-tokens/tokens.css"');
    expect(css).toContain('@import "./design-tokens/fonts.css"');
    // A2: the palette is generated from packages/design-tokens/tokens.json. Five
    // hand-written :root blocks used to live here and cascade into each other,
    // so the invariant is that there is exactly ONE :root, the alias layer, and
    // that every value in it points at a token rather than a literal.
    const rootBlocks = stripComments(css).match(/:root\s*\{/g) ?? [];
    expect(rootBlocks).toHaveLength(1);
    const aliasLayer = css.slice(css.indexOf(":root {"));
    const aliasBody = aliasLayer.slice(0, aliasLayer.indexOf("}"));
    const literals = aliasBody.match(/:\s*(#[0-9a-fA-F]{3,8}|rgba?\()/g) ?? [];
    expect(literals).toEqual([]);
    // Every alias must resolve to a --nabd- token.
    const aliases = aliasBody.match(/--[a-z-]+:\s*var\((--nabd-[a-zA-Z-]+)\)/g) ?? [];
    expect(aliases.length).toBeGreaterThan(20);
    // No legacy alias may reintroduce a literal colour.
    expect(css).not.toMatch(/--(brand|ink|canvas|surface|muted|line):\s*#/);
  });

  it("carries the owner palette and the locale font stacks in the token sheets", () => {
    expect(tokens).toContain("--nabd-color-brand-coral: #FF4B55");
    expect(tokens).toContain("--nabd-color-bg-canvas: #F5F5F7");
    expect(tokens).toContain("--nabd-color-text-primary: #0B1B2B");
    expect(tokens).toContain("--nabd-color-action-accent-bg: #D7FF00");
    expect(tokens).toMatch(/\[data-theme="dark"\]/);
    expect(fonts).toContain("--nabd-font-sans");
    expect(fonts).toContain("--nabd-font-ar");
  });

  /**
   * A `var(--x)` with nothing defining `--x` is not a fallback, it is a hole:
   * the declaration silently drops and the element inherits or falls back to
   * whatever the cascade happens to offer. Four such holes shipped in this file
   * (`--nabd-color-border-default`, `--nabd-color-glass-surface`,
   * `--nabd-font-family-body`, `--nabd-font-family-locale-ar`) and none of them
   * announced itself. This gate is what makes that class of bug impossible to
   * reintroduce quietly.
   */
  it("has no var() that resolves to nothing", () => {
    const defined = new Set<string>();
    for (const source of [stripComments(tokens), stripComments(fonts), stripComments(css)]) {
      for (const m of source.matchAll(/(--[a-zA-Z][a-zA-Z0-9-]*)\s*:/g)) defined.add(m[1]);
    }
    const referenced = [...new Set([...stripComments(css).matchAll(/var\(\s*(--[a-zA-Z][a-zA-Z0-9-]*)/g)].map((m) => m[1]))];
    expect(referenced.length).toBeGreaterThan(20);
    const dangling = referenced.filter((name) => !defined.has(name));
    expect(dangling, `var() with no definition: ${dangling.join(", ")}`).toEqual([]);
  });

  it("does not re-declare a dark palette over the generated one", () => {
    // tokens.css emits both themes; a second block here can only redeclare a
    // subset and leave the rest on their light values inside a dark theme.
    const bare = stripComments(css);
    expect(bare).not.toMatch(/(^|\})\s*html\.dark/);
    expect(bare).not.toMatch(/(^|\})\s*\.dark\s*\{/);
  });

  it("keeps visible keyboard focus and honours reduced-motion preferences", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
  });
});
