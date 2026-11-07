import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * F82 script budget: the by-name record of ALL filled glyphs (icons/fill-all.ts, and FIconByName which reads it) is for SERVER
 * code. A client module that imports it ships every outline (about 8 KB gzip) on every page that loads the module. A client
 * component draws `<FIcon icon="tooth" glyph={FILL_TOOTH} />` with the named outline it imports from icons/glyphs/<name>
 * (one module per glyph), or receives the outline from the server.
 */
const root = join(import.meta.dirname, "..");
const FORBIDDEN = [/icons\/fill-all["']/, /icons\/ficon-by-name["']/, /\/ficon-by-name["']/];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(full);
  }
  return out;
}
const files = ["app", "components-next", "lib"].flatMap((d) => walk(join(root, d)));
// linear scan (no backtracking): skips leading whitespace, // lines and /* */ blocks, then looks for the directive
const isClient = (text: string) => {
  let i = 0;
  for (;;) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (text.startsWith("//", i)) { const n = text.indexOf("\n", i); if (n < 0) return false; i = n + 1; }
    else if (text.startsWith("/*", i)) { const e = text.indexOf("*/", i + 2); if (e < 0) return false; i = e + 2; }
    else break;
  }
  return /^["']use client["']/.test(text.slice(i, i + 12));
};

describe("the full glyph record stays out of client modules", () => {
  it("there is no module that holds several outlines but fill-all (the bundler keeps a whole module)", () => {
    const offenders = files.filter((f) => /icons\/fill-glyphs["']/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => relative(root, f))).toEqual([]);
    const glyphs = readdirSync(join(root, "components-next/ui-generated/icons/glyphs"));
    expect(glyphs.length).toBeGreaterThan(70);
    for (const g of glyphs) expect(readFileSync(join(root, "components-next/ui-generated/icons/glyphs", g), "utf8").match(/export const FILL_/g)?.length, g).toBe(1);
  });

  it("no 'use client' module reaches fill-all or FIconByName, directly or through the modules it imports", () => {
    const text = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
    const resolve = (from: string, spec: string): string | null => {
      const base = spec.startsWith("@/") ? join(root, spec.slice(2)) : spec.startsWith(".") ? join(from, "..", spec) : null;
      if (!base) return null;
      return [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")].find((c) => text.has(c)) ?? null;
    };
    const importsOf = (f: string) => [...text.get(f)!.matchAll(/(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^;]*?from\s*["']([^"']+)["']/g)].filter((m) => !m[1]).map((m) => resolve(f, m[2])).filter((x): x is string => x !== null);
    const forbidden = (f: string) => /ficon-by-name\.tsx$|icons\/fill-all\.ts$/.test(f);
    const offenders: string[] = [];
    for (const start of files.filter((f) => isClient(text.get(f)!))) {
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) {
        const f = queue.pop()!;
        for (const i of importsOf(f)) {
          if (forbidden(i)) { offenders.push(`${relative(root, start)} -> ${relative(root, f)} -> ${relative(root, i)}`); continue; }
          if (!seen.has(i)) { seen.add(i); queue.push(i); }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the mirrors that are client modules never import fill-all either", () => {
    const mirrored = walk(join(root, "components-next/ui-generated")).filter((f) => isClient(readFileSync(f, "utf8")) || /Button|Feedback|Surfaces|Cards|Inputs|Controls/.test(f));
    for (const f of mirrored) expect(readFileSync(f, "utf8"), relative(root, f)).not.toMatch(/icons\/fill-all["']/);
  });

  it("FIconGlyph, the client-safe wrapper, reads no record of outlines", () => {
    const text = readFileSync(join(root, "components-next/icons/ficon-glyph.tsx"), "utf8");
    expect(text.split("\n").filter((l) => /^\s*import\b/.test(l)).join("\n")).not.toMatch(/fill-all/);
    expect(text).not.toMatch(/FILL_ALL_PATHS|[^`]fillGlyph\(/);
    expect(isClient(text)).toBe(false); // used from server and client modules alike
  });

  it("the by-name record of the mirror holds only the core glyphs, the rest are type-enforced extras", () => {
    const fill = readFileSync(join(root, "components-next/ui-generated/icons/fill.ts"), "utf8");
    const record = JSON.parse(fill.match(/export const FILL_ICON_PATHS = (\{[\s\S]*?\n\}) as const;/)![1]) as Record<string, string>;
    const extra = fill.match(/export type FillExtraName = ([^;]+);/)![1].split("|").map((s) => s.trim().replace(/'/g, ""));
    expect(extra.length).toBeGreaterThan(20);
    for (const name of extra) expect(record[name], name).toBeUndefined();
    const contract = readFileSync(join(root, "components-next/ui-generated/components/contract.ts"), "utf8");
    expect(contract).toMatch(/\{ icon: FillExtraName; glyph: string \}/); // a non-core name REQUIRES its outline
  });
});
