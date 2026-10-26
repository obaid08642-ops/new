import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", "tests"].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|mjs|css)$/.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

// the route stats / JS-size budgets of every other page rely on this: MapLibre (~800 KB) is in the address pages only
describe("MapLibre GL stays on the address pages", () => {
  const files = walk(root);
  it("one file imports it (and its stylesheet), and that file is only reached through next/dynamic with ssr: false", () => {
    const importers = files.filter((f) => /from\s+["']maplibre-gl|import\s+["']maplibre-gl|import\(["']maplibre-gl/.test(readFileSync(f, "utf8"))).map((f) => relative(root, f));
    expect(importers.sort()).toEqual(["components-next/account/address-map/map-canvas.tsx", "components-next/provider-map-canvas.tsx"]);
    const users = files.filter((f) => /address-map\/map-canvas|"\.\/map-canvas/.test(readFileSync(f, "utf8"))).map((f) => relative(root, f));
    expect(users.sort()).toEqual(["components-next/account/address-map/address-map.tsx"]);
    const explorer = readFileSync(join(root, "components-next/map-explorer-client.tsx"), "utf8");
    expect(explorer).toMatch(/dynamic\(\(\) => import\("\.\/provider-map-canvas"\), \{ ssr: false/);
    const picker = readFileSync(join(root, "components-next/account/address-map/address-map.tsx"), "utf8");
    expect(picker).toMatch(/dynamic\(\(\) => import\("\.\/map-canvas"\), \{ ssr: false/);
    expect(picker).not.toMatch(/^import (?!type )[^\n]*from "\.\/map-canvas"/m); // a type-only import is fine, a value import is not
  });

  it("only the address book imports the picker: the profile addresses page", () => {
    const users = files.filter((f) => /address-map\/address-map"/.test(readFileSync(f, "utf8"))).map((f) => relative(root, f));
    expect(users).toEqual(["components-next/account/address-book.tsx"]);
  });
});
