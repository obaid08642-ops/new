import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ar from "@/messages/ar.json";
import { CLIENT_NAMESPACES, ROUTE_GROUP_NAMESPACES, pickClientMessages, pickRouteMessages } from "./client-messages";

const root = resolve(process.cwd());

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

const files = ["app", "components-next", "lib"].flatMap((dir) => sources(join(root, dir)));

/** The project files a file imports (static, re-exports and dynamic import()), resolved like the bundler: `@/` and relative paths. */
const importCache = new Map<string, string[]>();
function imports(file: string): string[] {
  const cached = importCache.get(file);
  if (cached) return cached;
  const out: string[] = [];
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g)) {
    const spec = match[1] || match[2] || match[3];
    const base = spec.startsWith("@/") ? join(root, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(file), spec) : null;
    if (!base) continue;
    const hit = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext).find((path) => existsSync(path) && statSync(path).isFile());
    if (hit && /\.tsx?$/.test(hit)) out.push(hit);
  }
  importCache.set(file, out);
  return out;
}
function reachable(entry: string): Set<string> {
  const seen = new Set([entry]);
  const stack = [entry];
  while (stack.length) for (const next of imports(stack.pop()!)) if (!seen.has(next)) { seen.add(next); stack.push(next); }
  return seen;
}
const namespacesReadBy = (file: string) => [...readFileSync(file, "utf8").matchAll(/\buseTranslations\(\s*["']([A-Za-z][A-Za-z0-9]*)["']\s*\)/g)].map((m) => m[1]);

describe("client messages (F82-1)", () => {
  it("lists every namespace a component reads with useTranslations", () => {
    const used = new Set<string>();
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const call of text.matchAll(/\buseTranslations\(([^)]*)\)/g)) {
        const arg = call[1].trim();
        const literal = /^["']([A-Za-z][A-Za-z0-9]*)["']$/.exec(arg);
        // a call without a literal namespace would read the whole catalogue
        expect(literal, `${file}: useTranslations(${arg}) needs a literal namespace`).not.toBeNull();
        used.add(literal![1]);
      }
    }
    const groupOnly = new Set(Object.values(ROUTE_GROUP_NAMESPACES).flat());
    for (const namespace of used) {
      if (groupOnly.has(namespace)) continue; // read only under its route group, checked below
      expect(CLIENT_NAMESPACES as readonly string[], namespace).toContain(namespace);
    }
  });

  it("every page, layout, loading and error file reaches only the base namespaces and its section's (import graph)", () => {
    const localeDir = join(root, "app", "[locale]");
    const entries = sources(localeDir).filter((file) => /^(page|layout|loading|error|not-found|template|default)\.tsx?$/.test(file.split(/[\\/]/).pop()!));
    expect(entries.length).toBeGreaterThan(200);
    const base = new Set<string>(CLIENT_NAMESPACES);
    for (const entry of entries) {
      const rel = entry.slice(localeDir.length + 1).replace(/\\/g, "/");
      const section = rel.includes("/") ? rel.split("/")[0] : "";
      const allowed = new Set([...base, ...(ROUTE_GROUP_NAMESPACES[section] ?? [])]);
      for (const file of reachable(entry)) {
        for (const namespace of namespacesReadBy(file)) {
          expect(allowed.has(namespace), `${rel} reaches ${file.slice(root.length + 1)}, which reads ${namespace}: add it to ROUTE_GROUP_NAMESPACES["${section || "(root: CLIENT_NAMESPACES)"}"]`).toBe(true);
        }
      }
    }
  });

  it("each section with its own namespaces has a layout that provides them, and lists none of the base ones", () => {
    for (const [section, namespaces] of Object.entries(ROUTE_GROUP_NAMESPACES)) {
      const layout = join(root, "app", "[locale]", section, "layout.tsx");
      expect(existsSync(layout), `app/[locale]/${section}/layout.tsx`).toBe(true);
      expect(readFileSync(layout, "utf8"), section).toMatch(new RegExp(`<RouteMessages group="${section}"`));
      for (const namespace of namespaces) {
        expect(CLIENT_NAMESPACES as readonly string[], `${section}: ${namespace} is already a base namespace`).not.toContain(namespace);
        expect(Object.keys(ar), namespace).toContain(namespace);
      }
    }
  });

  it("picks the base namespaces plus a group's, and only the base ones for an unknown group", () => {
    const messages = { ...(ar as Record<string, unknown>) };
    expect(Object.keys(pickRouteMessages(messages, "no-such-group")).sort()).toEqual([...CLIENT_NAMESPACES].sort());
  });

  it("does not use a client hook that reads arbitrary messages", () => {
    for (const file of files) expect(readFileSync(file, "utf8"), file).not.toMatch(/\buseMessages\(/);
  });

  it("lists only namespaces that exist", () => {
    for (const namespace of CLIENT_NAMESPACES) expect(Object.keys(ar), namespace).toContain(namespace);
  });

  it("keeps only the listed namespaces and does not mutate the catalogue", () => {
    const before = Object.keys(ar).length;
    const picked = pickClientMessages(ar as Record<string, unknown>);
    expect(Object.keys(picked).sort()).toEqual([...CLIENT_NAMESPACES].sort());
    expect(Object.keys(ar)).toHaveLength(before);
  });
});
